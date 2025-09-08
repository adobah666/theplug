import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '@/app/api/admin/reviews/route'
import { PUT } from '@/app/api/admin/reviews/[id]/moderate/route'
import { connectDB } from '@/lib/db/connection'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import User from '@/lib/db/models/User'
import { generateToken } from '@/lib/auth/jwt'
import mongoose from 'mongoose'

// Mock the database connection
vi.mock('@/lib/db/connection')

describe('Admin Reviews API', () => {
  let testAdmin: any
  let authToken: string

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Mock successful database connection
    vi.mocked(connectDB).mockResolvedValue(undefined)

    // Create test admin user
    testAdmin = {
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin' // In future implementation
    }

    // Generate auth token
    authToken = generateToken(testAdmin._id.toString())

    // Mock model methods
    vi.spyOn(User, 'findById').mockResolvedValue(testAdmin)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/admin/reviews', () => {
    it('should get pending reviews for moderation', async () => {
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 5,
          title: 'Great product!',
          comment: 'Really love this product.',
          isVerifiedPurchase: true,
          moderationStatus: ModerationStatus.PENDING,
          helpfulVotes: 0,
          reportCount: 0,
          isVisible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: [{
            _id: new mongoose.Types.ObjectId(),
            name: 'John Doe',
            email: 'john@example.com'
          }],
          product: [{
            _id: new mongoose.Types.ObjectId(),
            name: 'Test Product',
            images: 'test-image.jpg'
          }],
          moderator: []
        }
      ]

      vi.spyOn(Review, 'aggregate').mockResolvedValue(mockReviews)
      vi.spyOn(Review, 'countDocuments').mockResolvedValue(1)

      const request = new Request('http://localhost/api/admin/reviews?status=pending', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toHaveLength(1)
      expect(data.reviews[0].moderationStatus).toBe(ModerationStatus.PENDING)
      expect(data.pagination.totalCount).toBe(1)
    })

    it('should get all reviews when status=all', async () => {
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 5,
          moderationStatus: ModerationStatus.APPROVED,
          user: [{ name: 'John Doe', email: 'john@example.com' }],
          product: [{ name: 'Test Product', images: 'test-image.jpg' }],
          moderator: []
        },
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 3,
          moderationStatus: ModerationStatus.REJECTED,
          user: [{ name: 'Jane Smith', email: 'jane@example.com' }],
          product: [{ name: 'Another Product', images: 'another-image.jpg' }],
          moderator: [{ name: 'Admin User' }]
        }
      ]

      vi.spyOn(Review, 'aggregate').mockResolvedValue(mockReviews)
      vi.spyOn(Review, 'countDocuments').mockResolvedValue(2)

      const request = new Request('http://localhost/api/admin/reviews?status=all', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toHaveLength(2)
    })

    it('should reject request without authentication', async () => {
      const request = new Request('http://localhost/api/admin/reviews')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should sort reviews by most reported', async () => {
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          reportCount: 5,
          moderationStatus: ModerationStatus.FLAGGED,
          user: [{}],
          product: [{}],
          moderator: []
        },
        {
          _id: new mongoose.Types.ObjectId(),
          reportCount: 2,
          moderationStatus: ModerationStatus.PENDING,
          user: [{}],
          product: [{}],
          moderator: []
        }
      ]

      vi.spyOn(Review, 'aggregate').mockResolvedValue(mockReviews)
      vi.spyOn(Review, 'countDocuments').mockResolvedValue(2)

      const request = new Request('http://localhost/api/admin/reviews?sortBy=most-reported', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews[0].reportCount).toBe(5)
      expect(data.reviews[1].reportCount).toBe(2)
    })
  })

  describe('PUT /api/admin/reviews/[id]/moderate', () => {
    it('should approve a review successfully', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const mockReview = {
        _id: reviewId,
        rating: 5,
        title: 'Great product!',
        comment: 'Really love this product.',
        isVerifiedPurchase: true,
        moderationStatus: ModerationStatus.APPROVED,
        moderationReason: null,
        moderatedAt: new Date(),
        moderatedBy: testAdmin._id,
        isVisible: true,
        helpfulVotes: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        moderate: vi.fn().mockResolvedValue(true)
      }

      vi.spyOn(Review, 'findById').mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: ModerationStatus.APPROVED
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Review moderated successfully')
      expect(data.review.moderationStatus).toBe(ModerationStatus.APPROVED)
      expect(mockReview.moderate).toHaveBeenCalledWith(
        ModerationStatus.APPROVED,
        undefined,
        testAdmin._id
      )
    })

    it('should reject a review with reason', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const mockReview = {
        _id: reviewId,
        moderationStatus: ModerationStatus.REJECTED,
        moderationReason: 'Inappropriate content',
        moderatedAt: new Date(),
        moderatedBy: testAdmin._id,
        isVisible: false,
        moderate: vi.fn().mockResolvedValue(true)
      }

      vi.spyOn(Review, 'findById').mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: ModerationStatus.REJECTED,
          reason: 'Inappropriate content'
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.review.moderationStatus).toBe(ModerationStatus.REJECTED)
      expect(data.review.moderationReason).toBe('Inappropriate content')
      expect(mockReview.moderate).toHaveBeenCalledWith(
        ModerationStatus.REJECTED,
        'Inappropriate content',
        testAdmin._id
      )
    })

    it('should require reason for rejection', async () => {
      const reviewId = new mongoose.Types.ObjectId()

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: ModerationStatus.REJECTED
          // Missing reason
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reason is required for rejection or flagging')
    })

    it('should reject invalid moderation status', async () => {
      const reviewId = new mongoose.Types.ObjectId()

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: 'invalid_status'
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid moderation status is required')
    })

    it('should handle non-existent review', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      vi.spyOn(Review, 'findById').mockResolvedValue(null)

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: ModerationStatus.APPROVED
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should reject request without authentication', async () => {
      const reviewId = new mongoose.Types.ObjectId()

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: ModerationStatus.APPROVED
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should validate reason length', async () => {
      const reviewId = new mongoose.Types.ObjectId()
      const longReason = 'a'.repeat(501) // Exceeds 500 character limit

      const request = new Request(`http://localhost/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: ModerationStatus.REJECTED,
          reason: longReason
        })
      })

      const response = await PUT(request, { params: { id: reviewId.toString() } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Moderation reason cannot exceed 500 characters')
    })
  })
})