/**
 * Mock Meilisearch client for testing when Meilisearch server is not available
 */

import { MeilisearchProduct } from './indexing'
import { ProductSearchParams, ProductSearchResults } from './search'

// In-memory storage for mock data
let mockProducts: MeilisearchProduct[] = []
let mockIndexSettings = {
  searchableAttributes: ['name', 'description', 'brand', 'searchableText'],
  filterableAttributes: ['category', 'brand', 'price', 'rating', 'inventory', 'variants.size', 'variants.color'],
  sortableAttributes: ['price', 'rating', 'createdAt', 'updatedAt', 'reviewCount'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness']
}

// Mock index class
class MockIndex {
  uid: string

  constructor(uid: string) {
    this.uid = uid
  }

  async updateSearchableAttributes(attributes: string[]) {
    mockIndexSettings.searchableAttributes = attributes
    return { taskUid: Date.now() }
  }

  async updateFilterableAttributes(attributes: string[]) {
    mockIndexSettings.filterableAttributes = attributes
    return { taskUid: Date.now() }
  }

  async updateSortableAttributes(attributes: string[]) {
    mockIndexSettings.sortableAttributes = attributes
    return { taskUid: Date.now() }
  }

  async updateRankingRules(rules: string[]) {
    mockIndexSettings.rankingRules = rules
    return { taskUid: Date.now() }
  }

  async addDocuments(documents: MeilisearchProduct[]) {
    // Add or update documents
    documents.forEach(doc => {
      const existingIndex = mockProducts.findIndex(p => p.id === doc.id)
      if (existingIndex >= 0) {
        mockProducts[existingIndex] = doc
      } else {
        mockProducts.push(doc)
      }
    })
    return { taskUid: Date.now() }
  }

  async deleteDocument(id: string) {
    mockProducts = mockProducts.filter(p => p.id !== id)
    return { taskUid: Date.now() }
  }

  async deleteAllDocuments() {
    mockProducts = []
    return { taskUid: Date.now() }
  }

  async search(query: string, params: any = {}) {
    let results = [...mockProducts]

    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase()
      results = results.filter(product => 
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.searchableText.toLowerCase().includes(lowerQuery)
      )
    }

    // Apply filters
    if (params.filter) {
      const filters = Array.isArray(params.filter) ? params.filter : [params.filter]
      
      filters.forEach((filter: string) => {
        if (filter.includes('category =')) {
          const category = filter.match(/"([^"]+)"/)?.[1]
          if (category) {
            results = results.filter(p => p.category === category)
          }
        }
        
        if (filter.includes('brand =')) {
          const brand = filter.match(/"([^"]+)"/)?.[1]
          if (brand) {
            results = results.filter(p => p.brand === brand)
          }
        }
        
        if (filter.includes('price ')) {
          const match = filter.match(/price (\d+(?:\.\d+)?) TO (\d+(?:\.\d+)?)/)
          if (match) {
            const min = parseFloat(match[1])
            const max = parseFloat(match[2])
            results = results.filter(p => p.price >= min && p.price <= max)
          }
        }
        
        if (filter.includes('rating >=')) {
          const rating = parseFloat(filter.match(/rating >= ([\d.]+)/)?.[1] || '0')
          results = results.filter(p => p.rating >= rating)
        }
        
        if (filter.includes('inventory > 0')) {
          results = results.filter(p => p.inventory > 0)
        }
        
        if (filter.includes('variants.size =')) {
          const size = filter.match(/"([^"]+)"/)?.[1]
          if (size) {
            results = results.filter(p => 
              p.variants.some(v => v.size === size)
            )
          }
        }
        
        if (filter.includes('variants.color =')) {
          const color = filter.match(/"([^"]+)"/)?.[1]
          if (color) {
            results = results.filter(p => 
              p.variants.some(v => v.color === color)
            )
          }
        }
      })
    }

    // Apply sorting
    if (params.sort && params.sort.length > 0) {
      const sortRule = params.sort[0]
      const [field, direction] = sortRule.split(':')
      
      results.sort((a: any, b: any) => {
        const aVal = a[field]
        const bVal = b[field]
        
        if (direction === 'desc') {
          return bVal - aVal
        } else {
          return aVal - bVal
        }
      })
    }

    // Apply pagination
    const offset = params.offset || 0
    const limit = params.limit || 20
    const paginatedResults = results.slice(offset, offset + limit)

    // Build facet distribution if facets are requested
    const facetDistribution: Record<string, Record<string, number>> = {}
    if (params.facets) {
      params.facets.forEach((facet: string) => {
        facetDistribution[facet] = {}
        
        if (facet === 'brand') {
          results.forEach(product => {
            const brand = product.brand
            facetDistribution[facet][brand] = (facetDistribution[facet][brand] || 0) + 1
          })
        }
        
        if (facet === 'category') {
          results.forEach(product => {
            const category = product.category
            facetDistribution[facet][category] = (facetDistribution[facet][category] || 0) + 1
          })
        }
      })
    }

    return {
      hits: paginatedResults,
      estimatedTotalHits: results.length,
      processingTimeMs: 1,
      query,
      facetDistribution
    }
  }

  async getStats() {
    return {
      numberOfDocuments: mockProducts.length,
      isIndexing: false,
      fieldDistribution: {
        name: mockProducts.length,
        description: mockProducts.length,
        brand: mockProducts.length,
        price: mockProducts.length
      }
    }
  }
}

// Mock client class
class MockMeiliSearch {
  host: string
  apiKey?: string

  constructor(config: { host: string; apiKey?: string }) {
    this.host = config.host
    this.apiKey = config.apiKey
  }

  async health() {
    return { status: 'available' }
  }

  index(uid: string) {
    return new MockIndex(uid)
  }
}

// Export mock client when Meilisearch is not available
export const createMockClient = (config: { host: string; apiKey?: string }) => {
  return new MockMeiliSearch(config)
}

export { MockIndex, MockMeiliSearch }