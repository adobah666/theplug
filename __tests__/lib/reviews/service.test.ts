import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import { calculateProductRating, getProductReviews, updateProductRating } from '@/lib/reviews/service'
import { ModerationStatus } from '@/lib/db/models/Review'

// Mock modules
vi.mock('@/lib/db/models/Review')
vi.mock('@/lib/db/models/Product')

describe('Reviews Service', () => {
  let testProductId: mongoose.Types.ObjectId

  beforeEach(() => {
    testProductId = new mongoose.Types.ObjectId()
    vi.clearAllMocks()
  })

  describe('calculateProductRating', () => {
    it('should calculate average rating and distribution', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      const mockAggregateResult = [{
        averageRating: 4.2,
        totalReviews: 5,
        ratingDistribution: [5, 4, 4, 3, 5]
      }]

      vi.mocked(Review.default.aggregate).mockResolvedValue(mockAggregateResult)

      const result = await calculateProductRating(testProductId)

      expect(result.averageRating).toBe(4.2)
      expect(result.totalReviews).toBe(5)
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 1,
        4: 2,
        5: 2
      })
    })

    it('should handle no reviews', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(Review.default.aggregate).mockResolvedValue([])

      const result = await calculateProductRating(testProductId)

      expect(result.averageRating).toBe(0)
      expect(result.totalReviews).toBe(0)
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      })
    })
  })

  describe('updateProductRating', () => {
    it('should update product with calculated rating', async () => {
      const Review = await import('@/lib/db/models/Review')
      const Product = await import('@/lib/db/models/Product')
      
      const mockAggregateResult = [{
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: [5, 5, 4, 4, 4, 4, 4, 3, 3, 5]
      }]

      vi.mocked(Review.default.aggregate).mockResolvedValue(mockAggregateResult)
      vi.mocked(Product.default.findByIdAndUpdate).mockResolvedValue({})

      await updateProductRating(testProductId)

      expect(Product.default.findByIdAndUpdate).toHaveBeenCalledWith(testProductId, {
        rating: 4.5,
        reviewCount: 10
      })
    })
  })

  describe('getProductReviews', () => {
    it('should get paginated reviews with default filters', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          rating: 5,
          title: 'Great product',
          comment: 'Love it!',
          isVerifiedPurchase: true,
          helpfulVotes: 3,
          createdAt: new Date(),
          user: { displayName: 'John D.' }
        }
      ]

      vi.mocked(Review.default.aggregate).mockResolvedValue(mockReviews)
      vi.mocked(Review.default.countDocuments).mockResolvedValue(1)

      const result = await getProductReviews(testProductId)

      expect(result.reviews).toHaveLength(1)
      expect(result.reviews[0].author).toBe('John D.')
      expect(result.pagination.totalCount).toBe(1)
      expect(result.pagination.currentPage).toBe(1)
    })

    it('should apply rating filter', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(Review.default.aggregate).mockResolvedValue([])
      vi.mocked(Review.default.countDocuments).mockResolvedValue(0)

      await getProductReviews(testProductId, { rating: 5 })

      // Verify that the aggregate was called with rating filter
      expect(Review.default.aggregate).toHaveBeenCalled()
      const aggregateCall = vi.mocked(Review.default.aggregate).mock.calls[0][0]
      const matchStage = aggregateCall.find((stage: any) => stage.$match)
      expect(matchStage.$match.rating).toBe(5)
    })

    it('should apply verified purchase filter', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(Review.default.aggregate).mockResolvedValue([])
      vi.mocked(Review.default.countDocuments).mockResolvedValue(0)

      await getProductReviews(testProductId, { verified: true })

      // Verify that the aggregate was called with verified purchase filter
      expect(Review.default.aggregate).toHaveBeenCalled()
      const aggregateCall = vi.mocked(Review.default.aggregate).mock.calls[0][0]
      const matchStage = aggregateCall.find((stage: any) => stage.$match)
      expect(matchStage.$match.isVerifiedPurchase).toBe(true)
    })

    it('should handle different sort options', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(Review.default.aggregate).mockResolvedValue([])
      vi.mocked(Review.default.countDocuments).mockResolvedValue(0)

      await getProductReviews(testProductId, { sortBy: 'most-helpful' })

      // Verify that the aggregate was called with correct sort order
      expect(Review.default.aggregate).toHaveBeenCalled()
      const aggregateCall = vi.mocked(Review.default.aggregate).mock.calls[0][0]
      const sortStage = aggregateCall.find((stage: any) => stage.$sort)
      expect(sortStage.$sort.helpfulVotes).toBe(-1)
    })

    it('should limit results to maximum 50 per page', async () => {
      const Review = await import('@/lib/db/models/Review')
      
      vi.mocked(Review.default.aggregate).mockResolvedValue([])
      vi.mocked(Review.default.countDocuments).mockResolvedValue(0)

      await getProductReviews(testProductId, { limit: 100 })

      // Verify that the limit is capped at 50
      expect(Review.default.aggregate).toHaveBeenCalled()
      const aggregateCall = vi.mocked(Review.default.aggregate).mock.calls[0][0]
      const limitStage = aggregateCall.find((stage: any) => stage.$limit)
      expect(limitStage.$limit).toBe(50)
    })
  })
})