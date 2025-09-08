import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import connectDB, { disconnectDB } from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import Product from '@/lib/db/models/Product'
import User from '@/lib/db/models/User'
import Category from '@/lib/db/models/Category'
import { signToken } from '@/lib/auth/jwt'

// Mock Next.js request/response
const mockRequest = (body: any, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) => ({
  json: async () => body,
  headers: {
    get: (name: string) => headers[name.toLowerCase()]
  },
  cookies: {
    get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined
  }
})

const mockResponse = () => {
  const cookieMap = new Map()
  const response = {
    status: 200,
    headers: new Map(),
    json: (data: any) => ({ ...response, data }),
    cookies: {
      set: (name: string, value: string, options?: any) => {
        cookieMap.set(name, { value, options })
      }
    }
  }
  return response
}

// Import route handlers
import { POST as addToCart } from '@/app/api/cart/add/route'
import { GET as getCart } from '@/app/api/cart/route'
import { PUT as updateCart } from '@/app/api/cart/update/route'
import { DELETE as removeFromCart } from '@/app/api/cart/remove/route'

describe('Cart API', () => {
  let testUser: any
  let testProduct: any
  let testCategory: any
  let authToken: string

  beforeEach(async () => {
    await connectDB()
    
    // Clean up existing data
    await Cart.deleteMany({})
    await Product.deleteMany({})
    await User.deleteMany({})
    await Category.deleteMany({})

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    })

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123'
    })

    // Generate auth token
    authToken = signToken({ userId: testUser._id.toString(), email: testUser.email })

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'Test product description',
      price: 99.99,
      images: ['test-image.jpg'],
      category: testCategory._id,
      brand: 'Test Brand',
      inventory: 10,
      variants: [
        {
          size: 'M',
          color: 'red',
          sku: 'TEST-M-RED',
          inventory: 5
        },
        {
          size: 'L',
          color: 'blue',
          sku: 'TEST-L-BLUE',
          inventory: 5
        }
      ]
    })
  })

  afterEach(async () => {
    await Cart.deleteMany({})
    await Product.deleteMany({})
    await User.deleteMany({})
    await Category.deleteMany({})
  })

  describe('POST /api/cart/add', () => {
    it('should add item to cart for authenticated user', async () => {
      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 2
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(1)
      expect(data.data.cart.items[0].quantity).toBe(2)
      expect(data.data.cart.itemCount).toBe(2)
      expect(data.data.cart.subtotal).toBe(199.98)
    })

    it('should add item to cart for guest user', async () => {
      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 1
        },
        {},
        {}
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(1)
      expect(data.data.cart.items[0].quantity).toBe(1)
    })

    it('should add item with variant to cart', async () => {
      const variant = testProduct.variants[0]
      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          variantId: variant._id.toString(),
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items[0].variantId).toBe(variant._id.toString())
      expect(data.data.cart.items[0].size).toBe('M')
      expect(data.data.cart.items[0].color).toBe('red')
    })

    it('should update quantity if item already exists in cart', async () => {
      // Add item first time
      const request1 = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      await addToCart(request1 as any)

      // Add same item again
      const request2 = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 2
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request2 as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.cart.items).toHaveLength(1)
      expect(data.data.cart.items[0].quantity).toBe(3)
    })

    it('should return error for invalid product ID', async () => {
      const request = mockRequest(
        {
          productId: '507f1f77bcf86cd799439011',
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Product not found')
    })

    it('should return error for invalid quantity', async () => {
      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 100 // Test with quantity > 99
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Quantity must be between 1 and 99')
    })
  })

  describe('GET /api/cart', () => {
    it('should get cart for authenticated user', async () => {
      // First add an item to cart
      await Cart.create({
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      const request = mockRequest(
        {},
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await getCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(1)
      expect(data.data.cart.itemCount).toBe(2)
    })

    it('should return empty cart for user with no cart', async () => {
      const request = mockRequest(
        {},
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await getCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(0)
      expect(data.data.cart.itemCount).toBe(0)
    })

    it('should get cart for guest user with session ID', async () => {
      const sessionId = 'guest_123456789'
      
      // Create cart for guest user
      await Cart.create({
        sessionId,
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      const request = mockRequest(
        {},
        {},
        { sessionId }
      )

      const response = await getCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(1)
    })
  })

  describe('PUT /api/cart/update', () => {
    it('should update item quantity in cart', async () => {
      // Create cart with item
      const cart = await Cart.create({
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      const itemId = cart.items[0]._id!.toString()

      const request = mockRequest(
        {
          itemId,
          quantity: 5
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await updateCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items[0].quantity).toBe(5)
      expect(data.data.cart.itemCount).toBe(5)
    })

    it('should remove item when quantity is 0', async () => {
      // Create cart with item
      const cart = await Cart.create({
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      const itemId = cart.items[0]._id!.toString()

      const request = mockRequest(
        {
          itemId,
          quantity: 0
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await updateCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(0)
      expect(data.message).toBe('Item removed from cart')
    })

    it('should return error for invalid item ID', async () => {
      const request = mockRequest(
        {
          itemId: '507f1f77bcf86cd799439011',
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await updateCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cart not found')
    })
  })

  describe('DELETE /api/cart/remove', () => {
    it('should remove item from cart', async () => {
      // Create cart with item
      const cart = await Cart.create({
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      const itemId = cart.items[0]._id!.toString()

      const request = mockRequest(
        {
          itemId
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await removeFromCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cart.items).toHaveLength(0)
      expect(data.message).toBe('Item removed from cart successfully')
    })

    it('should return error for non-existent item', async () => {
      // Create empty cart
      await Cart.create({
        userId: testUser._id,
        items: []
      })

      const request = mockRequest(
        {
          itemId: '507f1f77bcf86cd799439011'
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await removeFromCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Item not found in cart')
    })
  })

  describe('Inventory Validation', () => {
    it('should prevent adding items when out of stock', async () => {
      // Set product inventory to 0
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 0 })

      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only 0 items available in stock')
    })

    it('should prevent adding more items than available inventory', async () => {
      // Set product inventory to 2
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 2 })

      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          quantity: 5 // More than available
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only 2 items available in stock')
    })

    it('should prevent updating cart item quantity beyond available inventory', async () => {
      // Create cart with item
      const cart = await Cart.create({
        userId: testUser._id,
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: testProduct.price,
          name: testProduct.name,
          image: testProduct.images[0]
        }]
      })

      // Set product inventory to 2
      await Product.findByIdAndUpdate(testProduct._id, { inventory: 2 })

      const itemId = cart.items[0]._id!.toString()

      const request = mockRequest(
        {
          itemId,
          quantity: 5 // More than available
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await updateCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only 2 items available in stock')
    })

    it('should handle variant inventory validation', async () => {
      const variant = testProduct.variants[1] // Has inventory of 3
      
      // Set variant inventory to 0 to test out of stock
      await Product.findByIdAndUpdate(testProduct._id, {
        'variants.1.inventory': 0
      })
      
      const request = mockRequest(
        {
          productId: testProduct._id.toString(),
          variantId: variant._id.toString(),
          quantity: 1
        },
        {
          authorization: `Bearer ${authToken}`
        }
      )

      const response = await addToCart(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only 0 items available in stock')
    })
  })})
