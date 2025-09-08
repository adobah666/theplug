#!/usr/bin/env tsx

/**
 * Simple script to test Meilisearch connection
 */

import { config } from 'dotenv'
import client, { getProductsIndex, isMeilisearchAvailable, isUsingMock, initializeClient } from '../lib/meilisearch/client'

// Load environment variables
config({ path: '.env.local' })

async function testMeilisearch() {
  console.log('🔍 Testing Meilisearch connection...')
  
  try {
    // Initialize client to use real Meilisearch if available
    await initializeClient()
    
    // Check if real Meilisearch is available
    const isAvailable = await isMeilisearchAvailable()
    console.log('🔍 Meilisearch server available:', isAvailable)
    console.log('🔍 Using mock client:', isUsingMock())
    
    // Test basic connection
    const health = await client.health()
    console.log('✅ Meilisearch health:', health)
    
    // Test index access
    const index = getProductsIndex()
    console.log('✅ Products index created:', index.uid)
    
    // Test basic search (should work even with empty index)
    const results = await index.search('test')
    console.log('✅ Search test successful, hits:', results.hits.length)
    
    if (isUsingMock()) {
      console.log('⚠️  Using mock client - install and start Meilisearch for production use')
      console.log('💡 Install: curl -L https://install.meilisearch.com | sh')
      console.log('💡 Start: ./meilisearch --master-key=your-meilisearch-master-key')
    }
    
    console.log('🎉 Meilisearch connection test completed successfully!')
    
  } catch (error) {
    console.error('❌ Meilisearch connection test failed:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testMeilisearch()
}

export default testMeilisearch