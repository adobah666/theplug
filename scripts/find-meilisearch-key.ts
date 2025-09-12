#!/usr/bin/env tsx

/**
 * Script to help find the correct Meilisearch API key
 */

import { MeiliSearch } from 'meilisearch'

const commonKeys = [
  'masterKey',
  'meilisearch',
  'development',
  'dev',
  'test',
  'admin',
  'password',
  'secret',
  'key',
  'meilisearch-master-key',
  'your-meilisearch-master-key',
  'meilisearch-master-key-for-development'
]

async function findMeilisearchKey() {
  console.log('🔍 Trying to find the correct Meilisearch API key...')
  
  const host = 'http://localhost:7700'
  
  for (const key of commonKeys) {
    try {
      console.log(`🔑 Trying key: "${key}"`)
      
      const client = new MeiliSearch({
        host,
        apiKey: key,
      })
      
      const health = await client.health()
      console.log(`✅ SUCCESS! Key "${key}" works!`)
      console.log('Health response:', health)
      
      // Try to get indexes
      const indexes = await client.getIndexes()
      console.log('Available indexes:', indexes.results.map(i => i.uid))
      
      console.log(`\n🎉 Use this key in your .env.local:`)
      console.log(`MEILISEARCH_API_KEY=${key}`)
      
      return key
      
    } catch (error) {
      console.log(`❌ Key "${key}" failed:`, error instanceof Error ? error.message : String(error))
    }
  }
  
  console.log('\n❌ None of the common keys worked.')
  console.log('💡 Please check how you started Meilisearch and what master key you used.')
  console.log('💡 If you started it without a key, try restarting with: ./meilisearch --master-key=your-chosen-key')
}

// Run the key finder
if (require.main === module) {
  findMeilisearchKey()
}

export default findMeilisearchKey