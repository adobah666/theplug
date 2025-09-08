import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getProducts, POST as createProduct } from '@/app/api/products/route'
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '@/app/api/products/[id]/route'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import User from '@/lib/db/models/User'
import { signToken } from '@/lib/auth/jwt'
import mongoose from 'mongoose'

describe('Products API', () => {
  let testCategory: any
  let testUser: any
  let testProduct: any
  let authToken: string

  beforeEach(async () => {
    await connectDB()
    
    // Clean up existing test data
    await Product.deleteMany({})
    await Category.deleteMany({})
    await User.deleteMany({})

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      description: 'A test category'
    })

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'TestPassword123!'
    })

    // Generate auth token
    authToken = signToken({ userId: testUser._id.toString(), email: testUser.email })

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product description',
      price: 99.99,
      images: ['https://example.com/image1.jpg'],
      category: testCategory._id,
      brand: 'Test Brand',
      inventory: 10,
      variants: [{
        sku: 'TEST-001',
        size: 'M',
        color: 'blue',
        inventory: 5
      }]
    })
  })

  afterEach(async () => {
    await Product.deleteMany({})
    await Category.deleteMany({})
    await User.deleteMany({})
  })

  describe('GET /api/products', () => {
    it('should return paginated products list', async () => {
      const request = new NextRequest('http://localhost:3000/api/products?page=1&limit=10')
      const response = await getProducts(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('data')
      expect(data.data).toHaveProperty('pagination')
      expect(data.data.data).toHaveLength(1)
      expect(data.data.data[0].name).toBe('Test Product')
      expect(data.data.pagination.total).toBe(1)
    })

    it('should handle pagination parameters', async () => {
      // Create additional products
      await Product.create({
        name: 'Product 2',
        description: 'Second product',
        price: 149.99,
        images: ['https://example.com/image2.jpg'],
        category: testCategory._id,
        brand: 'Test Brand',
        inventory: 5
      })

      const request = new NextRequest('http://localhost:3000/api/products?page=1&limit=1&sort=price&order=asc')
      const response = await getProducts(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data).toHaveLength(1)
      expect(data.data.data[0].price).toBe(99.99) // Should be the cheaper product first
      expect(data.data.pagination.hasNext).toBe(true)
    })

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/products?page=0&limit=200')
      const response = await getProducts(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid pagination parameters')
    })
  })

  describe('POST /api/products', () => {
    it('should create a new product with authentication', async () => {
      const productData = {
        name: 'New Product',
        description: 'A new product description',
        price: 199.99,
        images: ['https://example.com/new-image.jpg'],
        category: testCategory._id.toString(),
        brand: 'New Brand',
        inventory: 20,
        variants: [{
          sku: 'NEW-001',
          size: 'L',
          color: 'red',
          inventory: 10
        }]
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productData)
      })

      const response = await createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.product.name).toBe('New Product')
      expect(data.data.product.variants).toHaveLength(1)
      expect(data.data.product.inventory).toBe(10) // Should be calculated from variants
    })

    it('should require authentication', async () => {
      const productData = {
        name: 'New Product',
        description: 'A new product description',
        price: 199.99,
        images: ['https://example.com/new-image.jpg'],
        category: testCategory._id.toString(),
        brand: 'New Brand',
        inventory: 20
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      })

      const response = await createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should validate required fields', async () => {
      const productData = {
        name: 'New Product',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productData)
      })

      const response = await createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should validate category ID format', async () => {
      const productData = {
        name: 'New Product',
        description: 'A new product description',
        price: 199.99,
        images: ['https://example.com/new-image.jpg'],
        category: 'invalid-id',
        brand: 'New Brand',
        inventory: 20
      }

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productData)
      })

      const response = await createProduct(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid category ID format')
    })
  })

  describe('GET /api/products/[id]', () => {
    it('should return product details', async () => {
      const request = new NextRequest(`http://localhost:3000/api/products/${testProduct._id}`)
      const response = await getProduct(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.product.name).toBe('Test Product')
      expect(data.data.product.variants).toHaveLength(1)
    })

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const request = new NextRequest(`http://localhost:3000/api/products/${nonExistentId}`)
      const response = await getProduct(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Product not found')
    })

    it('should validate product ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/invalid-id')
      const response = await getProduct(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid product ID format')
    })
  })

  describe('PUT /api/products/[id]', () => {
    it('should update product with authentication', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 149.99
      }

      const request = new NextRequest(`http://localhost:3000/api/products/${testProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updateData)
      })

      const response = await updateProduct(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.product.name).toBe('Updated Product Name')
      expect(data.data.product.price).toBe(149.99)
    })

    it('should require authentication', async () => {
      const updateData = { name: 'Updated Product Name' }

      const request = new NextRequest(`http://localhost:3000/api/products/${testProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await updateProduct(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const updateData = { name: 'Updated Product Name' }

      const request = new NextRequest(`http://localhost:3000/api/products/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updateData)
      })

      const response = await updateProduct(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Product not found')
    })
  })

  describe('DELETE /api/products/[id]', () => {
    it('should delete product with authentication', async () => {
      const request = new NextRequest(`http://localhost:3000/api/products/${testProduct._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await deleteProduct(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Product deleted successfully')

      // Verify product is deleted
      const deletedProduct = await Product.findById(testProduct._id)
      expect(deletedProduct).toBeNull()
    })

    it('should require authentication', async () => {
      const request = new NextRequest(`http://localhost:3000/api/products/${testProduct._id}`, {
        method: 'DELETE'
      })

      const response = await deleteProduct(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 404 for non-existent product', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()

      const request = new NextRequest(`http://localhost:3000/api/products/${nonExistentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await deleteProduct(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Product not found')
    })
  })
})