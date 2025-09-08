import { MeiliSearch } from 'meilisearch'
import { createMockClient } from './mock-client'

// Index names
export const PRODUCTS_INDEX = 'products'

// Initialize Meilisearch client with fallback to mock
let client: any
let usingMock = false

// Test if Meilisearch is available
export const isMeilisearchAvailable = async (): Promise<boolean> => {
  try {
    const testClient = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
    await testClient.health()
    return true
  } catch (error) {
    return false
  }
}

// Initialize client based on availability
const initializeClient = async () => {
  const isAvailable = await isMeilisearchAvailable()
  
  if (isAvailable) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
    usingMock = false
    console.log('Using real Meilisearch client')
  } else {
    client = createMockClient({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
    usingMock = true
    console.log('Using mock Meilisearch client for development')
  }
}

// For synchronous usage, create mock client by default
client = createMockClient({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
})
usingMock = true

// Get products index
export const getProductsIndex = () => client.index(PRODUCTS_INDEX)

// Check if using mock
export const isUsingMock = () => usingMock

export default client
export { initializeClient }