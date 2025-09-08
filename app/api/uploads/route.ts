import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Expect one or more files under the field name 'files'
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const urls: string[] = []

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
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 })
  }
}
