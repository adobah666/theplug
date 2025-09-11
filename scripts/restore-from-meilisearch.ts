#!/usr/bin/env tsx

/**
 * Restore products from Meilisearch into MongoDB.
 * - Recreates/updates Categories by slug (and name when available)
 * - Upserts Products by id
 *
 * Usage:
 *   1) Ensure env vars are set (MEILISEARCH_HOST, MEILISEARCH_API_KEY, MONGODB_URI, MONGODB_DB_NAME)
 *   2) Run: npx tsx scripts/restore-from-meilisearch.ts
 */

import { config } from 'dotenv'
import connectDB from '../lib/db/connection'
import Product from '../lib/db/models/Product'
import Category from '../lib/db/models/Category'
import { initializeClient, getProductsIndex } from '../lib/meilisearch/client'

// Load environment variables from .env.local (fallback to process env)
config({ path: '.env.local' })

async function restoreFromMeilisearch() {
  console.log('🚑 Starting restore from Meilisearch → MongoDB...')

  try {
    // Initialize Meilisearch client
    console.log('🔍 Initializing Meilisearch client...')
    await (initializeClient as any)()

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...')
    await connectDB()

    const index = getProductsIndex()

    // Discover total document count
    console.log('📈 Fetching total document count...')
    const stats = await index.getStats().catch(async () => {
      // Some clients use getDocuments to infer count
      const first = await index.getDocuments({ limit: 1 })
      const count = (first?.total ?? first?.estimatedTotalHits ?? first?.hits?.length ?? 0) as number
      return { numberOfDocuments: count }
    })

    const total = (stats?.numberOfDocuments as number) ?? 0
    console.log(`📊 Index contains ${total} documents`)

    const pageSize = 100
    let offset = 0
    let restored = 0

    while (offset < total) {
      console.log(`⬇️  Pulling documents ${offset + 1} - ${Math.min(offset + pageSize, total)} of ${total}`)

      // Try the Meilisearch getDocuments API first (faster for full export)
      let batch: any[] = []
      try {
        const res = await index.getDocuments({ limit: pageSize, offset })
        // Support both Meilisearch and mock shape
        batch = (res?.results ?? res?.hits ?? res) as any[]
      } catch (err) {
        // Fallback to search with empty query
        const res = await index.search('', { limit: pageSize, offset })
        batch = (res?.hits ?? []) as any[]
      }

      if (!Array.isArray(batch) || batch.length === 0) {
        break
      }

      for (const doc of batch) {
        try {
          // Create or update category by slug
          const categorySlug: string = doc.category || ''
          let categoryId = undefined as any

          if (categorySlug) {
            const existingCategory = await Category.findOne({ slug: categorySlug })
            if (existingCategory) {
              // Update name if we have one
              if (doc.categoryName && existingCategory.name !== doc.categoryName) {
                existingCategory.name = doc.categoryName
                await existingCategory.save()
              }
              categoryId = existingCategory._id
            } else {
              const created = await Category.create({
                name: doc.categoryName || categorySlug,
                slug: categorySlug,
                description: ''
              })
              categoryId = created._id
            }
          }

          // Prepare product payload compatible with Product schema
          const variants = Array.isArray(doc.variants) ? doc.variants.map((v: any) => ({
            sku: v.sku || '',
            size: v.size,
            color: v.color,
            price: typeof v.price === 'number' ? v.price : undefined,
            inventory: typeof v.inventory === 'number' ? v.inventory : 0,
          })) : []

          // Compute inventory fallback
          const computedInventory = variants.length > 0
            ? variants.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0)
            : (typeof doc.inventory === 'number' ? doc.inventory : 0)

          const update: any = {
            name: doc.name,
            description: doc.description || '',
            price: typeof doc.price === 'number' ? doc.price : 0,
            images: Array.isArray(doc.images) ? doc.images : [],
            category: categoryId,
            brand: doc.brand || '',
            inventory: computedInventory,
            variants,
            rating: typeof doc.rating === 'number' ? doc.rating : 0,
            reviewCount: typeof doc.reviewCount === 'number' ? doc.reviewCount : 0,
          }

          // Upsert by original ID (Meili stores as `id` string)
          const _id = doc.id
          await Product.updateOne(
            { _id },
            { $set: update },
            { upsert: true }
          )
          restored++
        } catch (e) {
          console.error('❌ Failed to restore product doc', doc?.id, e)
        }
      }

      offset += pageSize
    }

    console.log(`✅ Restore complete. Upserted ${restored} products.`)
    console.log('ℹ️  Note: Users, orders, carts and other entities are not stored in Meilisearch and must be restored from a DB backup.')
  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

if (require.main === module) {
  restoreFromMeilisearch()
}
