import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { config } from 'dotenv'
import connectDB from '../../../lib/db/connection'
import Product from '../../../lib/db/models/Product'
import Category from '../../../lib/db/models/Category'
import {
  initializeProductsIndex,
  indexProduct,
  indexProducts,
  removeProductFromIndex,
  clearProductsIndex,
  getIndexStats,
  productToMeilisearchDoc
} from '../../../lib/meilisearch/indexing'
import {
  searchProducts,
  getSearchSuggestions,
  getFacetValues
} from '../../../lib/meilisearch/search'
import mongoose from 'mongoose'

// Load test environment variables
config({ path: '.env.local' })

describe('Meilisearch Integration', () => {
  let testCategory: any
  let testProducts: any[] = []

  beforeAll(async () => {
    // Connect to test database
    await connectDB()
    
    // Initialize Meilisearch index
    await initializeProductsIndex()
    
    // Clear any existing test data
    await clearProductsIndex()
    await Product.deleteMany({ name: { $regex: /^Test Product/ } })
    await Category.deleteMany({ name: { $regex: /^Test Category/ } })
  })

  beforeEach(async () => {
    // Create test category
    testCategory = await Category.create({
      name: 'Test Category Electronics',
      description: 'Test category for electronics',
      slug: 'test-category-electronics'
    })

    // Create test products
    const productData = [
      {
        name: 'Test Product iPhone 15',
        description: 'Latest iPhone with advanced features and great camera',
        price: 999.99,
        images: ['https://example.com/iphone1.jpg', 'https://example.com/iphone2.jpg'],
        category: testCategory._id,
        brand: 'Apple',
        variants: [
          { sku: 'IP15-128-BLK', size: '128GB', color: 'black', inventory: 10 },
          { sku: 'IP15-256-WHT', size: '256GB', color: 'white', inventory: 5 }
        ],
        inventory: 15,
        rating: 4.5,
        reviewCount: 120
      },
      {
        name: 'Test Product Samsung Galaxy',
        description: 'Premium Android smartphone with excellent display',
        price: 799.99,
        images: ['https://example.com/samsung1.jpg'],
        category: testCategory._id,
        brand: 'Samsung',
        variants: [
          { sku: 'SG-128-BLU', size: '128GB', color: 'blue', inventory: 8 }
        ],
        inventory: 8,
        rating: 4.2,
        reviewCount: 85
      },
      {
        name: 'Test Product MacBook Pro',
        description: 'Professional laptop for developers and creators',
        price: 1999.99,
        images: ['https://example.com/macbook1.jpg'],
        category: testCategory._id,
        brand: 'Apple',
        variants: [
          { sku: 'MBP-512-SLV', size: '512GB', color: 'silver', inventory: 3 }
        ],
        inventory: 3,
        rating: 4.8,
        reviewCount: 200
      }
    ]

    testProducts = await Product.create(productData)
    
    // Wait a bit for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterEach(async () => {
    // Clean up test data
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

  describe('Index Management', () => {
    it('should initialize index with correct settings', async () => {
      const stats = await getIndexStats()
      expect(stats).toBeDefined()
      expect(typeof stats.numberOfDocuments).toBe('number')
    })

    it('should convert product to Meilisearch document correctly', () => {
      const product = testProducts[0]
      const doc = productToMeilisearchDoc(product)
      
      expect(doc.id).toBe(product._id.toString())
      expect(doc.name).toBe(product.name)
      expect(doc.description).toBe(product.description)
      expect(doc.brand).toBe(product.brand)
      expect(doc.price).toBe(product.price)
      expect(doc.variants).toHaveLength(product.variants.length)
      expect(doc.searchableText).toContain(product.name.toLowerCase())
    })

    it('should index single product', async () => {
      const newProduct = await Product.create({
        name: 'Test Product Single Index',
        description: 'Product for single indexing test',
        price: 299.99,
        images: ['https://example.com/test.jpg'],
        category: testCategory._id,
        brand: 'TestBrand',
        variants: [{ sku: 'TEST-001', inventory: 5 }],
        inventory: 5
      })

      await indexProduct(newProduct)
      
      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const results = await searchProducts({ query: 'Single Index' })
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.some(hit => hit.name.includes('Single Index'))).toBe(true)
      
      // Cleanup
      await Product.findByIdAndDelete(newProduct._id)
    })

    it('should index multiple products in batch', async () => {
      const stats = await getIndexStats()
      expect(stats.numberOfDocuments).toBeGreaterThanOrEqual(testProducts.length)
    })

    it('should remove product from index', async () => {
      const productToRemove = testProducts[0]
      await removeProductFromIndex(productToRemove._id.toString())
      
      // Wait for removal
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const results = await searchProducts({ query: productToRemove.name })
      expect(results.hits.some(hit => hit.id === productToRemove._id.toString())).toBe(false)
    })
  })

  describe('Product Search', () => {
    it('should search products by query', async () => {
      const results = await searchProducts({ query: 'iPhone' })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits[0].name).toContain('iPhone')
      expect(results.totalHits).toBeGreaterThan(0)
      expect(results.currentPage).toBe(1)
    })

    it('should search products by brand', async () => {
      const results = await searchProducts({ brand: 'Apple' })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.every(hit => hit.brand === 'Apple')).toBe(true)
    })

    it('should filter products by price range', async () => {
      const results = await searchProducts({ 
        minPrice: 800, 
        maxPrice: 1500 
      })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.every(hit => hit.price >= 800 && hit.price <= 1500)).toBe(true)
    })

    it('should filter products by minimum rating', async () => {
      const results = await searchProducts({ minRating: 4.5 })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.every(hit => hit.rating >= 4.5)).toBe(true)
    })

    it('should filter products by color', async () => {
      const results = await searchProducts({ color: 'black' })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.some(hit => 
        hit.variants.some(variant => variant.color === 'black')
      )).toBe(true)
    })

    it('should filter products by size', async () => {
      const results = await searchProducts({ size: '128GB' })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.some(hit => 
        hit.variants.some(variant => variant.size === '128GB')
      )).toBe(true)
    })

    it('should filter in-stock products only', async () => {
      const results = await searchProducts({ inStock: true })
      
      expect(results.hits.length).toBeGreaterThan(0)
      expect(results.hits.every(hit => hit.inventory > 0)).toBe(true)
    })

    it('should sort products by price ascending', async () => {
      const results = await searchProducts({ 
        sortBy: 'price_asc',
        limit: 10
      })
      
      expect(results.hits.length).toBeGreaterThan(1)
      
      for (let i = 1; i < results.hits.length; i++) {
        expect(results.hits[i].price).toBeGreaterThanOrEqual(results.hits[i - 1].price)
      }
    })

    it('should sort products by price descending', async () => {
      const results = await searchProducts({ 
        sortBy: 'price_desc',
        limit: 10
      })
      
      expect(results.hits.length).toBeGreaterThan(1)
      
      for (let i = 1; i < results.hits.length; i++) {
        expect(results.hits[i].price).toBeLessThanOrEqual(results.hits[i - 1].price)
      }
    })

    it('should sort products by rating descending', async () => {
      const results = await searchProducts({ 
        sortBy: 'rating_desc',
        limit: 10
      })
      
      expect(results.hits.length).toBeGreaterThan(1)
      
      for (let i = 1; i < results.hits.length; i++) {
        expect(results.hits[i].rating).toBeLessThanOrEqual(results.hits[i - 1].rating)
      }
    })

    it('should handle pagination correctly', async () => {
      const page1 = await searchProducts({ page: 1, limit: 2 })
      const page2 = await searchProducts({ page: 2, limit: 2 })
      
      expect(page1.currentPage).toBe(1)
      expect(page2.currentPage).toBe(2)
      expect(page1.hits.length).toBeLessThanOrEqual(2)
      
      // Ensure different results on different pages
      if (page1.hits.length > 0 && page2.hits.length > 0) {
        expect(page1.hits[0].id).not.toBe(page2.hits[0].id)
      }
    })

    it('should combine multiple filters', async () => {
      const results = await searchProducts({
        brand: 'Apple',
        minPrice: 900,
        minRating: 4.0,
        inStock: true
      })
      
      expect(results.hits.every(hit => 
        hit.brand === 'Apple' && 
        hit.price >= 900 && 
        hit.rating >= 4.0 && 
        hit.inventory > 0
      )).toBe(true)
    })
  })

  describe('Search Suggestions', () => {
    it('should return search suggestions', async () => {
      const suggestions = await getSearchSuggestions('iPhone', 3)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeLessThanOrEqual(3)
      
      if (suggestions.length > 0) {
        expect(suggestions.some(s => s.toLowerCase().includes('iphone'))).toBe(true)
      }
    })

    it('should limit suggestions correctly', async () => {
      const suggestions = await getSearchSuggestions('Test', 2)
      expect(suggestions.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Facet Values', () => {
    it('should return brand facet values', async () => {
      const facets = await getFacetValues('brand')
      
      expect(typeof facets).toBe('object')
      expect(Object.keys(facets).length).toBeGreaterThan(0)
      expect(facets['Apple']).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty search query', async () => {
      const results = await searchProducts({ query: '' })
      expect(results.hits).toBeDefined()
      expect(Array.isArray(results.hits)).toBe(true)
    })

    it('should handle invalid price range', async () => {
      const results = await searchProducts({ 
        minPrice: 1000, 
        maxPrice: 500 
      })
      expect(results.hits).toBeDefined()
      expect(results.hits.length).toBe(0)
    })

    it('should handle non-existent brand filter', async () => {
      const results = await searchProducts({ brand: 'NonExistentBrand' })
      expect(results.hits.length).toBe(0)
    })
  })
})