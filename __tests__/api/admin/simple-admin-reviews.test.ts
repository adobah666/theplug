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

describe('Admin Reviews API Integration', () => {
  let testAdminId: string
  let testReviewId: string

  beforeEach(() => {
    testAdminId = new mongoose.Types.ObjectId().toString()
    testReviewId = new mongoose.Types.ObjectId().toString()
    vi.clearAllMocks()
  })

  describe('GET /api/admin/reviews', () => {
    it('should require authentication', async () => {
      const { GET } = await import('@/app/api/admin/reviews/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: false
      })

      const request = new Request('http://localhost/api/admin/reviews')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return reviews for authenticated admin', async () => {
      const { GET } = await import('@/app/api/admin/reviews/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testAdminId
      })

      // Mock empty results
      vi.mocked(Review.default.aggregate).mockResolvedValue([])
      vi.mocked(Review.default.countDocuments).mockResolvedValue(0)

      const request = new Request('http://localhost/api/admin/reviews?status=pending', {
        headers: {
          'Authorization': 'Bearer token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toEqual([])
      expect(data.pagination.totalCount).toBe(0)
    })
  })

  describe('PUT /api/admin/reviews/[id]/moderate', () => {
    it('should require authentication', async () => {
      const { PUT } = await import('@/app/api/admin/reviews/[id]/moderate/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: false
      })

      const request = new Request(`http://localhost/api/admin/reviews/${testReviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: ModerationStatus.APPROVED
        })
      })

      const response = await PUT(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should validate moderation status', async () => {
      const { PUT } = await import('@/app/api/admin/reviews/[id]/moderate/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testAdminId
      })

      const request = new Request(`http://localhost/api/admin/reviews/${testReviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          status: 'invalid_status'
        })
      })

      const response = await PUT(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid moderation status is required')
    })

    it('should require reason for rejection', async () => {
      const { PUT } = await import('@/app/api/admin/reviews/[id]/moderate/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testAdminId
      })

      const request = new Request(`http://localhost/api/admin/reviews/${testReviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          status: ModerationStatus.REJECTED
          // Missing reason
        })
      })

      const response = await PUT(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reason is required for rejection or flagging')
    })

    it('should validate reason length', async () => {
      const { PUT } = await import('@/app/api/admin/reviews/[id]/moderate/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testAdminId
      })

      const longReason = 'a'.repeat(501) // Exceeds 500 character limit

      const request = new Request(`http://localhost/api/admin/reviews/${testReviewId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          status: ModerationStatus.REJECTED,
          reason: longReason
        })
      })

      const response = await PUT(request, { params: { id: testReviewId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Moderation reason cannot exceed 500 characters')
    })

    it('should validate review ID format', async () => {
      const { PUT } = await import('@/app/api/admin/reviews/[id]/moderate/route')
      const { verifyToken } = await import('@/lib/auth/middleware')
      
      vi.mocked(verifyToken).mockResolvedValue({
        success: true,
        userId: testAdminId
      })

      const request = new Request('http://localhost/api/admin/reviews/invalid-id/moderate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          status: ModerationStatus.APPROVED
        })
      })

      const response = await PUT(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid review ID format')
    })
  })
})