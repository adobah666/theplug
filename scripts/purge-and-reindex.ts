#!/usr/bin/env tsx

/**
 * Script to purge Meilisearch index and re-index from production database
 * Run with: npx tsx scripts/purge-and-reindex.ts
 */
  
import { config } from 'dotenv'
import { MeiliSearch } from 'meilisearch'
import connectDB from '../lib/db/connection'
import Product from '../lib/db/models/Product'
import '../lib/db/models/Category'
import { initializeProductsIndex, indexProducts, getIndexStats } from '../lib/meilisearch/indexing'
import { initializeClient } from '../lib/meilisearch/client'

// Load environment variables
config({ path: '.env.local' })

async function purgeAndReindex() {
  console.log('🚀 Starting Meilisearch purge and re-index...')
  console.log(`📦 Database: ${process.env.MONGODB_DB_NAME}`)
  
  try {
    // Initialize Meilisearch client
    console.log('🔍 Initializing Meilisearch client...')
    await initializeClient()
    console.log('✅ Meilisearch client initialized')
    
    // Create direct MeiliSearch client for deletion
    const meiliClient = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
    
    // Delete existing index
    console.log('🗑️  Purging existing Meilisearch index...')
    try {
      await meiliClient.deleteIndex('products')
      console.log('✅ Index deleted')
      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error: any) {
      if (error.code === 'index_not_found') {
        console.log('ℹ️  No existing index to delete')
      } else {
        throw error
      }
    }
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...')
    await connectDB()
    console.log('✅ Connected to MongoDB')
    
    // Initialize fresh Meilisearch index
    console.log('🔍 Creating fresh Meilisearch index...')
    await initializeProductsIndex()
    console.log('✅ Meilisearch index created')
    
    // Get existing products from MongoDB
    console.log('📊 Fetching products from production database...')
    const products = await Product.find({}).populate({ path: 'category', select: 'slug name' })
    console.log(`📦 Found ${products.length} products`)
    
    if (products.length > 0) {
      // Index all products in batches
      const batchSize = 100
      const batches = []
      
      for (let i = 0; i < products.length; i += batchSize) {
        batches.push(products.slice(i, i + batchSize))
      }
      
      console.log(`🔄 Indexing products in ${batches.length} batches...`)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`📝 Indexing batch ${i + 1}/${batches.length} (${batch.length} products)`)
        
        await indexProducts(batch)
        
        // Small delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log('✅ All products indexed successfully')
    } else {
      console.log('⚠️  No products found in database')
    }
    
    // Get final index stats
    console.log('📈 Getting index statistics...')
    const stats = await getIndexStats()
    console.log('📊 Index Stats:', {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
      fieldDistribution: stats.fieldDistribution
    })
    
    console.log('🎉 Purge and re-index completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during purge and re-index:', error)
    process.exit(1)
  } finally {
    // Close MongoDB connection
    process.exit(0)
  }
}

// Run the script
if (require.main === module) {
  purgeAndReindex()
}

export default purgeAndReindex
