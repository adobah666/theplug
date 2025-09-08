import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { config } from 'dotenv'
import connectDB from '../../../lib/db/connection'
import Product from '../../../lib/db/models/Product'
import Category from '../../../lib/db/models/Category'
import { initializeProductsIndex, clearProductsIndex } from '../../../lib/meilisearch/indexing'
import mongoose from 'mongoose'

// Load test environment variables
config({ path: '.env.local' })

// Mock Next.js request/response for API testing
const createMockRequest = (url: string, method: string = 'GET', body?: any) => {
  const request = {
    url,
    method,
    json: async () => body,
    headers: new Map()
  } as any
  
  return request
}

describe('Meilisearch API Endpoints', () => {
  let testCategory: any
  let testProducts: any[] = []

  beforeAll(async () => {
    await connectDB()
    await initializeProductsIndex()
    await clearProductsIndex()
    await Product.deleteMany({ name: { $regex: /^Test Product/ } })
    await Category.deleteMany({ name: { $regex: /^Test Category/ } })
  })

  beforeEach(async () => {
    // Create test category
    testCategory = await Category.create({
      name: 'Test Category Fashion',
      description: 'Test category for fashion items',
      slug: 'test-category-fashion'
    })

    // Create test products
    const productData = [
      {
        name: 'Test Product Designer Jeans',
        description: 'Premium denim jeans with perfect fit and style',
        price: 129.99,
        images: ['https://example.com/jeans1.jpg', 'https://example.com/jeans2.jpg'],
        category: testCategory._id,
        brand: 'Levi\'s',
        variants: [
          { sku: 'JEANS-32-BLU', size: '32', color: 'blue', inventory: 15 },
          { sku: 'JEANS-34-BLK', size: '34', color: 'black', inventory: 10 }
        ],
        inventory: 25,
        rating: 4.3,
        reviewCount: 89
      },
      {
        name: 'Test Product Cotton T-Shirt',
        description: 'Comfortable cotton t-shirt for everyday wear',
        price: 29.99,
        images: ['https://example.com/tshirt1.jpg'],
        category: testCategory._id,
        brand: 'Nike',
        variants: [
          { sku: 'TSHIRT-M-WHT', size: 'M', color: 'white', inventory: 20 },
          { sku: 'TSHIRT-L-RED', size: 'L', color: 'red', inventory: 12 }
        ],
        inventory: 32,
        rating: 4.1,
        reviewCount: 156
      },
      {
        name: 'Test Product Running Shoes',
        description: 'High-performance running shoes for athletes',
        price: 159.99,
        images: ['https://example.com/shoes1.jpg'],
        category: testCategory._id,
        brand: 'Adidas',
        variants: [
          { sku: 'SHOES-9-BLK', size: '9', color: 'black', inventory: 8 },
          { sku: 'SHOES-10-WHT', size: '10', color: 'white', inventory: 5 }
        ],
        inventory: 13,
        rating: 4.7,
        reviewCount: 203
      }
    ]

    testProducts = await Product.create(productData)
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterEach(async () => {
    await clearProductsIndex()
    if (testProducts.length > 0) {
      await Product.deleteMany({ _id: { $in: testProducts.map(p => p._id) } })
    }
    if (testCategory) {
      await Category.findByIdAndDelete(testCategory._id)
    }
    testProducts = []
    testCategory = null
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe('GET /api/products/meilisearch', () => {
    // Import the route handler
    let GET: any

    beforeAll(async () => {
      const module = await import('../../../app/api/products/meilisearch/route')
      GET = module.GET
    })

    it('should search products with basic query', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?q=jeans')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.hits).toBeDefined()
      expect(Array.isArray(data.data.hits)).toBe(true)
      expect(data.pagination).toBeDefined()
    })

    it('should filter products by brand', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?brand=Nike')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.every((hit: any) => hit.brand === 'Nike')).toBe(true)
      }
    })

    it('should filter products by price range', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?minPrice=50&maxPrice=150')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.every((hit: any) => hit.price >= 50 && hit.price <= 150)).toBe(true)
      }
    })

    it('should filter products by minimum rating', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?minRating=4.5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.every((hit: any) => hit.rating >= 4.5)).toBe(true)
      }
    })

    it('should filter products by size', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?size=M')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.some((hit: any) => 
          hit.variants.some((variant: any) => variant.size === 'M')
        )).toBe(true)
      }
    })

    it('should filter products by color', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?color=black')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.some((hit: any) => 
          hit.variants.some((variant: any) => variant.color === 'black')
        )).toBe(true)
      }
    })

    it('should filter in-stock products only', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?inStock=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.every((hit: any) => hit.inventory > 0)).toBe(true)
      }
    })

    it('should sort products by price ascending', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?sortBy=price_asc')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 1) {
        for (let i = 1; i < data.data.hits.length; i++) {
          expect(data.data.hits[i].price).toBeGreaterThanOrEqual(data.data.hits[i - 1].price)
        }
      }
    })

    it('should sort products by price descending', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?sortBy=price_desc')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 1) {
        for (let i = 1; i < data.data.hits.length; i++) {
          expect(data.data.hits[i].price).toBeLessThanOrEqual(data.data.hits[i - 1].price)
        }
      }
    })

    it('should handle pagination correctly', async () => {
      const request1 = createMockRequest('http://localhost:3000/api/products/meilisearch?page=1&limit=2')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.success).toBe(true)
      expect(data1.pagination.currentPage).toBe(1)
      expect(data1.pagination.limit).toBe(2)
    })

    it('should validate page parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?page=0')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Page number must be greater than 0')
    })

    it('should validate limit parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?limit=101')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Limit must be between 1 and 100')
    })

    it('should validate price parameters', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?minPrice=-10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Minimum price cannot be negative')
    })

    it('should validate price range', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?minPrice=100&maxPrice=50')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Minimum price cannot be greater than maximum price')
    })

    it('should validate rating parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?minRating=6')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Rating must be between 0 and 5')
    })

    it('should combine multiple filters', async () => {
      const request = createMockRequest('http://localhost:3000/api/products/meilisearch?brand=Nike&minPrice=20&maxPrice=50&inStock=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      if (data.data.hits.length > 0) {
        expect(data.data.hits.every((hit: any) => 
          hit.brand === 'Nike' && 
          hit.price >= 20 && 
          hit.price <= 50 && 
          hit.inventory > 0
        )).toBe(true)
      }
    })
  })

  describe('POST /api/products/meilisearch/suggestions', () => {
    let POST: any

    beforeAll(async () => {
      const module = await import('../../../app/api/products/meilisearch/route')
      POST = module.POST
    })

    it('should return search suggestions', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/products/meilisearch/suggestions',
        'POST',
        { query: 'test', limit: 3 }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.query).toBe('test')
      expect(Array.isArray(data.data.suggestions)).toBe(true)
      expect(data.data.suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should validate query parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/products/meilisearch/suggestions',
        'POST',
        { limit: 5 }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Query parameter is required')
    })

    it('should validate query length', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/products/meilisearch/suggestions',
        'POST',
        { query: 'a', limit: 5 }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Query must be at least 2 characters long')
    })

    it('should validate limit parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/products/meilisearch/suggestions',
        'POST',
        { query: 'test', limit: 25 }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Limit must be between 1 and 20')
    })

    it('should use default limit when not provided', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/products/meilisearch/suggestions',
        'POST',
        { query: 'test' }
      )
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.suggestions.length).toBeLessThanOrEqual(5)
    })
  })
})