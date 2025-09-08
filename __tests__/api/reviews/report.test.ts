import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import { ModerationStatus } from '@/lib/db/models/Review'

// Mock modules
vi.mock('@/lib/db/connection', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/lib/auth/middleware', () => ({
  verifyToken: vi.fn()
}))

vi.mock('@/lib/db/models/Review')

describe('Review Report API', () => {
  let testUserId: string
  let testReviewId: string
  let anotherUserId: string

  beforeEach(() => {
    testUserId = new mongoose.Types.ObjectId().toString()
    anotherUserId = new mongoose.Types.ObjectId().toString()
    testReviewId = new mongoose.Types.ObjectId().toString()
    vi.clearAllMocks()
  })

  describe('POST /api/reviews/[id]/report', () => {
    it('should require authentication', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: false
      })

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should validate review ID format', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const request = new Request('http://localhost/api/reviews/invalid-id/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid review ID format')
    })

    it('should require report reason', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          // Missing reason
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Report reason is required')
    })

    it('should validate reason length', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const longReason = 'a'.repeat(501) // Exceeds 500 character limit

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: longReason
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Report reason cannot exceed 500 characters')
    })

    it('should handle non-existent review', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      vi.mocked(Review.default.findById).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should reject reporting non-approved review', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const mockReview = {
        _id: testReviewId,
        userId: new mongoose.Types.ObjectId(anotherUserId),
        moderationStatus: ModerationStatus.PENDING,
        isVisible: true
      }

      vi.mocked(Review.default.findById).mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not available')
    })

    it('should reject reporting own review', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const mockReview = {
        _id: testReviewId,
        userId: new mongoose.Types.ObjectId(testUserId), // Same user
        moderationStatus: ModerationStatus.APPROVED,
        isVisible: true
      }

      vi.mocked(Review.default.findById).mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot report your own review')
    })

    it('should report review successfully', async () => {
      const { POST } = await import('@/app/api/reviews/[id]/report/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testUserId
      })

      const mockReview = {
        _id: testReviewId,
        userId: new mongoose.Types.ObjectId(anotherUserId), // Different user
        moderationStatus: ModerationStatus.APPROVED,
        isVisible: true,
        reportCount: 1,
        reportReview: vi.fn().mockResolvedValue(true)
      }

      vi.mocked(Review.default.findById).mockResolvedValue(mockReview)

      const request = new Request(`http://localhost/api/reviews/${testReviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          reason: 'Inappropriate content'
        })
      })

      const response = await POST(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Review reported successfully')
      expect(data.reportCount).toBe(1)
      expect(mockReview.reportReview).toHaveBeenCalled()
    })
  })
})