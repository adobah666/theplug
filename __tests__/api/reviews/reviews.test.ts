import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/reviews/route'
import { GET } from '@/app/api/reviews/product/[id]/route'
import { POST as PostHelpful } from '@/app/api/reviews/[id]/helpful/route'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import Order, { OrderStatus, PaymentStatus } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import User from '@/lib/db/models/User'
import { generateToken } from '@/lib/auth/jwt'
import mongoose from 'mongoose'

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  connectDB: vi.fn()
}))

// Mock the auth middleware
vi.mock('@/lib/auth/middleware', () => ({
  verifyToken: vi.fn()
}))

describe('Reviews API', () => {
  let testUser: any
  let testProduct: any
  let testOrder: any
  let authToken: string
  let mockConnectDB: any
  let mockVerifyToken: any

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Create test user first
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword'
    }
    
    // Mock successful database connection
    const { connectDB } = await import('@/lib/db/connection')
    mockConnectDB = vi.mocked(connectDB)
    mockConnectDB.mockResolvedValue(undefined)
    
    // Mock auth middleware
    const { verifyToken } = await import('@/lib/auth/middleware')
    mockVerifyToken = vi.mocked(verifyToken)
    mockVerifyToken.mockResolvedValue({
      success: true,
      userId: testUser._id.toString()
    })

    // Create test product
    testProduct = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      images: ['test-image.jpg'],
      category: new mongoose.Types.ObjectId(),
      brand: 'Test Brand',
      inventory: 10
    }

    // Create test order (verified purchase)
    testOrder = {
      _id: new mongoose.Types.ObjectId(),
      userId: testUser._id,
      items: [{
        productId: testProduct._id,
        productName: testProduct.name,
        productImage: testProduct.images[0],
        quantity: 1,
        unitPrice: testProduct.price,
        totalPrice: testProduct.price
      }],
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      total: testProduct.price
    }

    // Generate auth token
    authToken = generateToken(testUser._id.toString())

    // Mock model methods
    vi.spyOn(Product, 'findById').mockResolvedValue(testProduct)
    vi.spyOn(User, 'findById').mockResolvedValue(testUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/reviews', () => {
    it('should create a review successfully for verified purchase', async () => {
      // Mock existing review check (no existing review)
      vi.spyOn(Review, 'findOne').mockResolvedValue(null)
      
      // Mock order check (user has purchased product)
      vi.spyOn(Order, 'findOne').mockResolvedValue(testOrder)

      // Mock review creation
      const mockReview = {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        productId: testProduct._id,
        orderId: testOrder._id,
        rating: 5,
        title: 'Great product!',
        comment: 'Really love this product, highly recommended.',
        isVerifiedPurchase: true,
        moderationStatus: ModerationStatus.PENDING,
        helpfulVotes: 0,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      }

      vi.spyOn(Review.prototype, 'save').mockResolvedValue(mockReview)
      const reviewConstructorSpy = vi.spyOn(Review.prototype, 'constructor' as any)

      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 5,
          title: 'Great product!',
          comment: 'Really love this product, highly recommended.'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Review submitted successfully')
      expect(data.review).toMatchObject({
        productId: testProduct._id,
        rating: 5,
        title: 'Great product!',
        comment: 'Really love this product, highly recommended.',
        isVerifiedPurchase: true,
        moderationStatus: ModerationStatus.PENDING
      })
    })

    it('should create a review for non-verified purchase', async () => {
      // Mock existing review check (no existing review)
      vi.spyOn(Review, 'findOne').mockResolvedValue(null)
      
      // Mock order check (user has not purchased product)
      vi.spyOn(Order, 'findOne').mockResolvedValue(null)

      // Mock review creation
      const mockReview = {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        productId: testProduct._id,
        rating: 4,
        title: 'Good product',
        isVerifiedPurchase: false,
        moderationStatus: ModerationStatus.PENDING,
        helpfulVotes: 0,
        createdAt: new Date(),
        save: vi.fn().mockResolvedValue(true)
      }

      vi.spyOn(Review.prototype, 'save').mockResolvedValue(mockReview)

      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 4,
          title: 'Good product'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.review.isVerifiedPurchase).toBe(false)
    })

    it('should reject review without authentication', async () => {
      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 5,
          title: 'Great product!'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should reject review with missing required fields', async () => {
      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString()
          // Missing rating
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product ID and rating are required')
    })

    it('should reject review with invalid rating', async () => {
      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 6, // Invalid rating
          title: 'Great product!'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Rating must be an integer between 1 and 5')
    })

    it('should reject review for non-existent product', async () => {
      vi.spyOn(Product, 'findById').mockResolvedValue(null)

      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 5,
          title: 'Great product!'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Product not found')
    })

    it('should reject duplicate review from same user', async () => {
      // Mock existing review
      const existingReview = {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        productId: testProduct._id,
        rating: 4
      }
      vi.spyOn(Review, 'findOne').mockResolvedValue(existingReview)

      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 5,
          title: 'Great product!'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('You have already reviewed this product')
    })

    it('should reject review without title or comment', async () => {
      const request = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
          rating: 5
          // No title or comment
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Review must have either a title or comment')
    })
  })

  describe('GET /api/reviews/product/[id]', () => {
    it('should get product reviews successfully', async () => {
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 5,
          title: 'Great product!',
          comment: 'Really love this product.',
          isVerifiedPurchase: true,
          helpfulVotes: 3,
          createdAt: new Date(),
          user: [{
            displayName: 'John D.'
          }]
        },
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 4,
          title: 'Good quality',
          comment: 'Nice product, good value.',
          isVerifiedPurchase: false,
          helpfulVotes: 1,
          createdAt: new Date(),
          user: [{
            displayName: 'Jane S.'
          }]
        }
      ]

      const mockAverageRating = [{
        averageRating: 4.5,
        totalReviews: 2,
        ratingDistribution: [5, 4]
      }]

      vi.spyOn(Review, 'aggregate').mockImplementation((pipeline: any[]) => {
        // Check if this is the reviews query or the average rating query
        if (pipeline.some(stage => stage.$lookup)) {
          return Promise.resolve(mockReviews)
        } else {
          return Promise.resolve(mockAverageRating)
        }
      })

      vi.spyOn(Review, 'countDocuments').mockResolvedValue(2)

      const request = new Request(`http://localhost/api/reviews/product/${testProduct._id}`)
      const response = await GET(request, { params: { id: testProduct._id.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toHaveLength(2)
      expect(data.summary.averageRating).toBe(4.5)
      expect(data.summary.totalReviews).toBe(2)
      expect(data.pagination.totalCount).toBe(2)
    })

    it('should handle invalid product ID', async () => {
      const request = new Request('http://localhost/api/reviews/product/invalid-id')
      const response = await GET(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid product ID format')
    })
  })

  describe('POST /api/reviews/[id]/helpful', () => {
    it('should mark review as helpful successfully', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const mockReview = {
        _id: reviewId,
        userId: new mongoose.Types.ObjectId(), // Different from test user
        moderationStatus: ModerationStatus.APPROVED,
        isVisible: true,
        helpfulVotes: 5,
        addHelpfulVote: vi.fn().mockResolvedValue(true)
      }

      vi.spyOn(Review, 'findById').mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await PostHelpful(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Review marked as helpful')
      expect(mockReview.addHelpfulVote).toHaveBeenCalled()
    })

    it('should reject voting on own review', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const mockReview = {
        _id: reviewId,
        userId: testUser._id, // Same as test user
        moderationStatus: ModerationStatus.APPROVED,
        isVisible: true
      }

      vi.spyOn(Review, 'findById').mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await PostHelpful(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot vote on your own review')
    })

    it('should reject voting on non-approved review', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const mockReview = {
        _id: reviewId,
        userId: new mongoose.Types.ObjectId(),
        moderationStatus: ModerationStatus.PENDING,
        isVisible: true
      }

      vi.spyOn(Review, 'findById').mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await PostHelpful(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not available')
    })
  })
})