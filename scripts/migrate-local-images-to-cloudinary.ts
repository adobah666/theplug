import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { v2 as cloudinary } from 'cloudinary'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'

// Usage:
//  - Ensure env vars are set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//  - Optionally: CLOUDINARY_FOLDER (default: "theplug")
//  - Run:  npx tsx scripts/migrate-local-images-to-cloudinary.ts [--dry-run]
// Behavior:
//  - Finds all products whose images include local paths starting with '/'
//  - Resolves those files under the project's public/ directory and uploads them to Cloudinary
//  - Updates the product's images array to replace the local paths with Cloudinary secure URLs
//  - Skips images that already look like Cloudinary URLs

function isCloudinaryUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  return /(^https?:)?\/\/res\.cloudinary\.com\//.test(url)
}

async function main() {
  // Load env from .env.local first, then fallback to .env
  const root = path.resolve(process.cwd())
  const envLocalPath = path.join(root, '.env.local')
  const envPath = path.join(root, '.env')
  const loadedLocal = dotenv.config({ path: envLocalPath })
  if (loadedLocal.error) {
    dotenv.config({ path: envPath })
  }

  const DRY_RUN = process.argv.includes('--dry-run') || /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || ''))
  if (DRY_RUN) {
    console.log('[migrate-images] DRY_RUN is enabled')
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const folder = process.env.CLOUDINARY_FOLDER || 'theplug'

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[migrate-images] Missing Cloudinary env vars. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
    process.exit(1)
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  const projectRoot = path.resolve(process.cwd())
  const publicDir = path.join(projectRoot, 'public')

  await connectDB()

  const cursor = Product.find({ images: { $exists: true, $type: 'array', $ne: [] } }).cursor()
  let updatedCount = 0
  let uploadedCount = 0
  let scanned = 0

  for await (const prod of cursor as any) {
    scanned += 1
    const images: string[] = Array.isArray(prod.images) ? prod.images : []
    const nextImages: string[] = []

    for (const img of images) {
      try {
        if (!img || typeof img !== 'string') continue
        if (isCloudinaryUrl(img)) { nextImages.push(img); continue }
        if (!img.startsWith('/')) { nextImages.push(img); continue }

        const absPath = path.join(publicDir, img.replace(/^\/+/, ''))
        try {
          await fs.access(absPath)
        } catch {
          console.warn(`[migrate-images] File not found for product ${prod._id}: ${absPath} (from ${img}), keeping original`)
          nextImages.push(img)
          continue
        }

        if (DRY_RUN) {
          console.log(`[dry-run] Would upload ${absPath} to Cloudinary folder ${folder}`)
          nextImages.push(img)
          continue
        }

        const uploadRes = await cloudinary.uploader.upload(absPath, {
          folder,
          overwrite: false,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
        })
        if (uploadRes?.secure_url) {
          uploadedCount += 1
          nextImages.push(uploadRes.secure_url)
          console.log(`[migrate-images] Uploaded -> ${uploadRes.secure_url}`)
        } else {
          console.warn(`[migrate-images] Upload returned no secure_url for ${absPath}, keeping original`)
          nextImages.push(img)
        }
      } catch (e: any) {
        console.error(`[migrate-images] Error processing image '${img}' for product ${prod._id}:`, e?.message || e)
        nextImages.push(img)
      }
    }

    // If any changes, persist
    if (!DRY_RUN && JSON.stringify(images) !== JSON.stringify(nextImages)) {
      await Product.updateOne({ _id: prod._id }, { $set: { images: nextImages } })
      updatedCount += 1
    }
  }

  console.log(`[migrate-images] scanned=${scanned} uploaded=${uploadedCount} updatedProducts=${updatedCount} dryRun=${DRY_RUN}`)
}

main().catch((e) => {
  console.error('[migrate-images] Fatal error:', e)
  process.exit(1)
})
