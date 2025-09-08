#!/usr/bin/env tsx

/**
 * Script to initialize Meilisearch index and sync existing products
 * Run with: npm run init:meilisearch or tsx scripts/init-meilisearch.ts
 */

import { config } from 'dotenv'
import connectDB from '../lib/db/connection'
import Product from '../lib/db/models/Product'
import { initializeProductsIndex, indexProducts, getIndexStats } from '../lib/meilisearch/indexing'
import { initializeClient } from '../lib/meilisearch/client'

// Load environment variables
config({ path: '.env.local' })

async function initializeMeilisearch() {
  console.log('🚀 Starting Meilisearch initialization...')
  
  try {
    // Initialize Meilisearch client
    console.log('🔍 Initializing Meilisearch client...')
    await initializeClient()
    console.log('✅ Meilisearch client initialized')
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...')
    await connectDB()
    console.log('✅ Connected to MongoDB')
    
    // Initialize Meilisearch index
    console.log('🔍 Initializing Meilisearch index...')
    await initializeProductsIndex()
    console.log('✅ Meilisearch index initialized')
    
    // Get existing products from MongoDB
    console.log('📊 Fetching existing products...')
    const products = await Product.find({}).populate('category')
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
        
        // Small delay between batches to avoid overwhelming Meilisearch
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log('✅ All products indexed successfully')
    }
    
    // Get final index stats
    console.log('📈 Getting index statistics...')
    const stats = await getIndexStats()
    console.log('📊 Index Stats:', {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
      fieldDistribution: stats.fieldDistribution
    })
    
    console.log('🎉 Meilisearch initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Error initializing Meilisearch:', error)
    process.exit(1)
  } finally {
    // Close MongoDB connection
    process.exit(0)
  }
}

// Run the initialization
if (require.main === module) {
  initializeMeilisearch()
}

export default initializeMeilisearch