import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Expect one or more files under the field name 'files'
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const urls: string[] = []

    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
    const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET
    const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'theplug'

    const canUseCloudinary = !!CLOUDINARY_CLOUD_NAME && (!!CLOUDINARY_UPLOAD_PRESET || (!!CLOUDINARY_API_KEY && !!CLOUDINARY_API_SECRET))

    if (canUseCloudinary) {
      // Upload to Cloudinary (unsigned if preset provided; otherwise signed)
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' })

        const form = new FormData()
        form.append('file', blob, file.name)

        const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

        if (CLOUDINARY_UPLOAD_PRESET) {
          form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
          if (CLOUDINARY_FOLDER) form.append('folder', CLOUDINARY_FOLDER)
          const res = await fetch(endpoint, { method: 'POST', body: form })
          const json = await res.json()
          if (!res.ok) {
            console.error('Cloudinary upload error:', json)
            throw new Error(json?.error?.message || 'Cloudinary upload failed')
          }
          urls.push(json.secure_url || json.url)
        } else {
          // Signed upload
          const timestamp = Math.floor(Date.now() / 1000)
          const paramsToSign: Record<string, string> = { timestamp: String(timestamp) }
          if (CLOUDINARY_FOLDER) paramsToSign.folder = CLOUDINARY_FOLDER
          const paramString = Object.keys(paramsToSign)
            .sort()
            .map(k => `${k}=${paramsToSign[k]}`)
            .join('&')
          const signature = crypto
            .createHash('sha1')
            .update(paramString + CLOUDINARY_API_SECRET)
            .digest('hex')

          form.append('api_key', CLOUDINARY_API_KEY!)
          form.append('timestamp', String(timestamp))
          form.append('signature', signature)
          if (CLOUDINARY_FOLDER) form.append('folder', CLOUDINARY_FOLDER)

          const res = await fetch(endpoint, { method: 'POST', body: form })
          const json = await res.json()
          if (!res.ok) {
            console.error('Cloudinary signed upload error:', json)
            throw new Error(json?.error?.message || 'Cloudinary upload failed')
          }
          urls.push(json.secure_url || json.url)
        }
      }

      return NextResponse.json({ success: true, urls })
    } else {
      // Fallback: save locally to public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadsDir, { recursive: true })
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const ext = path.extname(file.name) || '.jpg'
        const safeBase = path.basename(file.name, ext).replace(/[^a-z0-9\-_.]/gi, '_')
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeBase}${ext}`
        const filepath = path.join(uploadsDir, filename)
        await fs.writeFile(filepath, buffer)
        urls.push(`/uploads/${filename}`)
      }
      return NextResponse.json({ success: true, urls })
    }
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 })
  }
}
