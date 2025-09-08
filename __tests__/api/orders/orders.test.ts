import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import Product from '@/lib/db/models/Product'
import Order, { OrderStatus, PaymentStatus, PaymentMethod } from '@/lib/db/models/Order'
import Cart from '@/lib/db/models/Cart'
import Category from '@/lib/db/models/Category'
import { signToken } from '@/lib/auth/jwt'
import { POST as createOrder, GET as getOrders } from '@/app/api/orders/route'
import { GET as getOrderById } from '@/app/api/orders/[id]/route'
import { PUT as updateOrderStatus } from '@/app/api/orders/[id]/status/route'
import { GET as getUserOrders } from '@/app/api/orders/user/[userId]/route'

// Helper function to create a mock NextRequest
function createMockRequest(method: string, url: string, body?: any, headers?: Record<string, string>) {
  const request = new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return request
}

describe('Order API Integration Tests', () => {
  let testUser: any
  let testProduct: any
  let testCategory: any
  let testCart: any
  let authToken: string

  beforeEach(async () => {
    await connectDB()
    
    // Clean up existing test data
    await User.deleteMany({ email: /test.*@example\.com/ })
    await Product.deleteMany({ name: /Test Product/ })
    await Order.deleteMany({})
    await Cart.deleteMany({})
    await Category.deleteMany({ name: /Test Category/ })

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
    })

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'hashedpassword123',
      phone: '+1234567890'
    })

    // Create test product with fresh inventory
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product for order testing',
      price: 99.99,
      images: ['https://example.com/image1.jpg'],
      category: testCategory._id,
      brand: 'Test Brand',
      inventory: 10,
      variants: [
        {
          size: 'M',
          color: 'blue',
          sku: 'TEST-M-BLUE',
          inventory: 5
        },
        {
          size: 'L',
          color: 'red',
          sku: 'TEST-L-RED',
          inventory: 3
        }
      ]
    })

    // Create test cart
    testCart = await Cart.create({
      userId: testUser._id,
      items: [
        {
          productId: testProduct._id,
          variantId: testProduct.variants[0]._id,
          quantity: 2,
          price: 99.99,
          name: 'Test Product',
          image: 'https://example.com/image1.jpg',
          size: 'M',
          color: 'blue'
        }
      ]
    })

    // Generate auth token
    authToken = signToken({ userId: testUser._id.toString(), email: testUser.email })
  })

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ })
    await Product.deleteMany({ name: /Test Product/ })
    await Order.deleteMany({})
    await Cart.deleteMany({})
    await Category.deleteMany({ name: /Test Category/ })
  })

  describe('POST /api/orders', () => {
    it('should create order from cart successfully', async () => {
      const orderData = {
        cartId: testCart._id.toString(),
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: PaymentMethod.CARD,
        tax: 10,
        shipping: 5,
        discount: 0
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Order created successfully')
      expect(data.order).toHaveProperty('id')
      expect(data.order).toHaveProperty('orderNumber')
      expect(data.order.total).toBe(214.98) // (99.99 * 2) + 10 + 5 = 214.98
      expect(data.order.status).toBe(OrderStatus.PENDING)
      expect(data.order.paymentStatus).toBe(PaymentStatus.PENDING)

      // Verify cart was deleted
      const deletedCart = await Cart.findById(testCart._id)
      expect(deletedCart).toBeNull()

      // Verify inventory was reserved
      const updatedProduct = await Product.findById(testProduct._id)
      const variant = updatedProduct!.variants.find(v => v._id!.toString() === testProduct.variants[0]._id.toString())
      expect(variant!.inventory).toBe(3) // 5 - 2 = 3
    })

    it('should create order from provided items successfully', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct._id,
            variantId: testProduct.variants[1]._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            size: 'L',
            color: 'red',
            quantity: 1,
            unitPrice: 99.99,
            totalPrice: 99.99
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        tax: 8,
        shipping: 10
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.order.total).toBe(117.99) // 99.99 + 8 + 10 = 117.99
    })

    it('should fail when cart is empty', async () => {
      // Create empty cart
      const emptyCart = await Cart.create({
        userId: testUser._id,
        items: []
      })

      const orderData = {
        cartId: emptyCart._id.toString(),
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: PaymentMethod.CARD
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to create order')
      expect(data.details).toContain('Cart not found or empty')
    })

    it('should fail when insufficient inventory', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct._id,
            variantId: testProduct.variants[1]._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            size: 'L',
            color: 'red',
            quantity: 10, // More than available (3)
            unitPrice: 99.99,
            totalPrice: 999.90
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: PaymentMethod.CARD
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Failed to create order')
    })

    it('should fail without authentication', async () => {
      const orderData = {
        cartId: testCart._id.toString(),
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: PaymentMethod.CARD
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should fail with missing shipping address', async () => {
      const orderData = {
        cartId: testCart._id.toString(),
        paymentMethod: PaymentMethod.CARD
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Shipping address is required')
    })

    it('should fail with invalid payment method', async () => {
      const orderData = {
        cartId: testCart._id.toString(),
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        },
        paymentMethod: 'invalid_method'
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/orders',
        orderData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await createOrder(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid payment method is required')
    })
  })

  describe('GET /api/orders', () => {
    let testOrder: any

    beforeEach(async () => {
      // Create test order
      testOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: testProduct.variants[0]._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            size: 'M',
            color: 'blue',
            quantity: 1,
            unitPrice: 99.99,
            totalPrice: 99.99
          }
        ],
        subtotal: 99.99,
        tax: 8,
        shipping: 10,
        total: 117.99,
        paymentMethod: PaymentMethod.CARD,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        }
      })
    })

    it('should get user orders successfully', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/orders',
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getOrders(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0]._id.toString()).toBe(testOrder._id.toString())
      expect(data.pagination).toHaveProperty('page', 1)
      expect(data.pagination).toHaveProperty('total', 1)
    })

    it('should handle pagination correctly', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/orders?page=1&limit=5',
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getOrders(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(5)
    })

    it('should fail without authentication', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/orders'
      )

      const response = await getOrders(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('GET /api/orders/[id]', () => {
    let testOrder: any

    beforeEach(async () => {
      testOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            quantity: 1,
            unitPrice: 99.99,
            totalPrice: 99.99
          }
        ],
        subtotal: 99.99,
        tax: 8,
        shipping: 10,
        total: 117.99,
        paymentMethod: PaymentMethod.CARD,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        }
      })
    })

    it('should get order by ID successfully', async () => {
      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/orders/${testOrder._id}`,
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getOrderById(request, { params: { id: testOrder._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.order._id.toString()).toBe(testOrder._id.toString())
      expect(data.order.total).toBe(117.99)
    })

    it('should fail with invalid order ID', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/orders/invalid-id',
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getOrderById(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order ID format')
    })

    it('should fail when order not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/orders/${nonExistentId}`,
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getOrderById(request, { params: { id: nonExistentId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Order not found')
    })
  })

  describe('PUT /api/orders/[id]/status', () => {
    let testOrder: any

    beforeEach(async () => {
      // Reserve inventory first (simulate what happens during order creation)
      const product = await Product.findById(testProduct._id)
      const variantIndex = product!.variants.findIndex(v => v._id!.toString() === testProduct.variants[0]._id.toString())
      product!.variants[variantIndex].inventory -= 1 // Reserve 1 item
      await product!.save()

      testOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: testProduct.variants[0]._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            size: 'M',
            color: 'blue',
            quantity: 1,
            unitPrice: 99.99,
            totalPrice: 99.99
          }
        ],
        subtotal: 99.99,
        tax: 8,
        shipping: 10,
        total: 117.99,
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.CARD,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        }
      })
    })

    it('should cancel order successfully', async () => {
      const updateData = {
        status: OrderStatus.CANCELLED,
        cancelReason: 'Customer requested cancellation'
      }

      const request = createMockRequest(
        'PUT',
        `http://localhost:3000/api/orders/${testOrder._id}/status`,
        updateData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await updateOrderStatus(request, { params: { id: testOrder._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Order status updated successfully')
      expect(data.order.status).toBe(OrderStatus.CANCELLED)
      expect(data.order.cancelReason).toBe('Customer requested cancellation')

      // Verify inventory was restored (should be back to 5 after cancellation)
      const updatedProduct = await Product.findById(testProduct._id)
      const variant = updatedProduct!.variants.find(v => v._id!.toString() === testProduct.variants[0]._id.toString())
      expect(variant!.inventory).toBe(5) // Should be restored to original after cancellation
    })

    it('should fail with invalid status transition', async () => {
      // Try to change from PENDING to DELIVERED (not allowed for users)
      const updateData = {
        status: OrderStatus.DELIVERED
      }

      const request = createMockRequest(
        'PUT',
        `http://localhost:3000/api/orders/${testOrder._id}/status`,
        updateData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await updateOrderStatus(request, { params: { id: testOrder._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status transition')
    })

    it('should fail when cancelling without reason', async () => {
      const updateData = {
        status: OrderStatus.CANCELLED
        // Missing cancelReason
      }

      const request = createMockRequest(
        'PUT',
        `http://localhost:3000/api/orders/${testOrder._id}/status`,
        updateData,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await updateOrderStatus(request, { params: { id: testOrder._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cancel reason is required when cancelling an order')
    })
  })

  describe('GET /api/orders/user/[userId]', () => {
    let testOrder: any

    beforeEach(async () => {
      testOrder = await Order.create({
        userId: testUser._id,
        items: [
          {
            productId: testProduct._id,
            productName: 'Test Product',
            productImage: 'https://example.com/image1.jpg',
            quantity: 1,
            unitPrice: 99.99,
            totalPrice: 99.99
          }
        ],
        subtotal: 99.99,
        tax: 8,
        shipping: 10,
        total: 117.99,
        paymentMethod: PaymentMethod.CARD,
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          recipientName: 'Test Recipient',
          recipientPhone: '+1234567890'
        }
      })
    })

    it('should get user orders successfully', async () => {
      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/orders/user/${testUser._id}`,
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getUserOrders(request, { params: { userId: testUser._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0]._id.toString()).toBe(testOrder._id.toString())
    })

    it('should fail when accessing another user\'s orders', async () => {
      const anotherUser = await User.create({
        name: 'Another User',
        email: `another-${Date.now()}@example.com`,
        password: 'hashedpassword123',
        phone: '+1234567891'
      })

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/orders/user/${anotherUser._id}`,
        undefined,
        { authorization: `Bearer ${authToken}` }
      )

      const response = await getUserOrders(request, { params: { userId: anotherUser._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })
})