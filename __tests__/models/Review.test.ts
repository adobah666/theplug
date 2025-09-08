import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Review, { IReview, ModerationStatus } from '../../lib/db/models/Review'

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce-test'
  await mongoose.connect(mongoUri, {
    dbName: 'fashion-ecommerce-test'
  })
}, 30000) // 30 second timeout for database connection

afterAll(async () => {
  await mongoose.connection.close()
}, 30000)

beforeEach(async () => {
  // Clean up the Review collection before each test
  await Review.deleteMany({})
})

describe('Review Model', () => {
  const validReviewData = {
    userId: new mongoose.Types.ObjectId(),
    productId: new mongoose.Types.ObjectId(),
    rating: 5,
    title: 'Great product!',
    comment: 'I really love this product. It exceeded my expectations and the quality is amazing.'
  }

  describe('Review Creation', () => {
    it('should create a valid review', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      expect(savedReview._id).toBeDefined()
      expect(savedReview.userId).toEqual(validReviewData.userId)
      expect(savedReview.productId).toEqual(validReviewData.productId)
      expect(savedReview.rating).toBe(5)
      expect(savedReview.title).toBe('Great product!')
      expect(savedReview.comment).toBe('I really love this product. It exceeded my expectations and the quality is amazing.')
      expect(savedReview.isVerifiedPurchase).toBe(false)
      expect(savedReview.moderationStatus).toBe(ModerationStatus.PENDING)
      expect(savedReview.helpfulVotes).toBe(0)
      expect(savedReview.reportCount).toBe(0)
      expect(savedReview.isVisible).toBe(true)
      expect(savedReview.createdAt).toBeDefined()
      expect(savedReview.updatedAt).toBeDefined()
    })

    it('should create review with only title', async () => {
      const reviewData = {
        ...validReviewData,
        title: 'Excellent!',
        comment: undefined
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.title).toBe('Excellent!')
      expect(savedReview.comment).toBeUndefined()
    })

    it('should create review with only comment', async () => {
      const reviewData = {
        ...validReviewData,
        title: undefined,
        comment: 'This is a great product that I would recommend to anyone.'
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.title).toBeUndefined()
      expect(savedReview.comment).toBe('This is a great product that I would recommend to anyone.')
    })

    it('should set verified purchase when orderId is provided', async () => {
      const reviewData = {
        ...validReviewData,
        orderId: new mongoose.Types.ObjectId()
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.isVerifiedPurchase).toBe(true)
      expect(savedReview.orderId).toEqual(reviewData.orderId)
    })
  })

  describe('Review Validation', () => {
    it('should require userId', async () => {
      const reviewData = { ...validReviewData }
      delete (reviewData as any).userId

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('User ID is required')
    })

    it('should require productId', async () => {
      const reviewData = { ...validReviewData }
      delete (reviewData as any).productId

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Product ID is required')
    })

    it('should require rating', async () => {
      const reviewData = { ...validReviewData }
      delete (reviewData as any).rating

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Rating is required')
    })

    it('should require either title or comment', async () => {
      const reviewData = {
        ...validReviewData,
        title: undefined,
        comment: undefined
      }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Review must have either a title or comment')
    })

    it('should validate rating range (minimum)', async () => {
      const reviewData = { ...validReviewData, rating: 0 }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Rating must be at least 1 star')
    })

    it('should validate rating range (maximum)', async () => {
      const reviewData = { ...validReviewData, rating: 6 }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Rating cannot be more than 5 stars')
    })

    it('should require whole number rating', async () => {
      const reviewData = { ...validReviewData, rating: 4.5 }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Rating must be a whole number')
    })

    it('should validate title length', async () => {
      const reviewData = { 
        ...validReviewData, 
        title: 'A'.repeat(101) // 101 characters
      }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Review title cannot exceed 100 characters')
    })

    it('should validate comment length', async () => {
      const reviewData = { 
        ...validReviewData, 
        comment: 'A'.repeat(2001) // 2001 characters
      }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Review comment cannot exceed 2000 characters')
    })

    it('should prevent duplicate reviews from same user for same product', async () => {
      // Create first review
      const review1 = new Review(validReviewData)
      await review1.save()

      // Try to create second review for same user and product
      const review2 = new Review({
        ...validReviewData,
        title: 'Another review',
        rating: 4
      })
      
      await expect(review2.save()).rejects.toThrow('User has already reviewed this product')
    })

    it('should allow reviews from different users for same product', async () => {
      // Create first review
      const review1 = new Review(validReviewData)
      await review1.save()

      // Create second review from different user
      const review2 = new Review({
        ...validReviewData,
        userId: new mongoose.Types.ObjectId(),
        title: 'Different user review'
      })
      const savedReview2 = await review2.save()

      expect(savedReview2._id).toBeDefined()
      expect(savedReview2.userId).not.toEqual(validReviewData.userId)
    })

    it('should allow reviews from same user for different products', async () => {
      // Create first review
      const review1 = new Review(validReviewData)
      await review1.save()

      // Create second review for different product
      const review2 = new Review({
        ...validReviewData,
        productId: new mongoose.Types.ObjectId(),
        title: 'Different product review'
      })
      const savedReview2 = await review2.save()

      expect(savedReview2._id).toBeDefined()
      expect(savedReview2.productId).not.toEqual(validReviewData.productId)
    })
  })

  describe('Moderation Status', () => {
    it('should validate moderation status enum', async () => {
      const reviewData = { ...validReviewData, moderationStatus: 'invalid_status' as ModerationStatus }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow()
    })

    it('should set moderatedAt when status changes from pending', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      expect(savedReview.moderatedAt).toBeUndefined()

      savedReview.moderationStatus = ModerationStatus.APPROVED
      const updatedReview = await savedReview.save()

      expect(updatedReview.moderatedAt).toBeDefined()
      expect(updatedReview.moderatedAt).toBeInstanceOf(Date)
    })

    it('should set visibility based on moderation status (approved)', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      savedReview.moderationStatus = ModerationStatus.APPROVED
      const updatedReview = await savedReview.save()

      expect(updatedReview.isVisible).toBe(true)
    })

    it('should set visibility based on moderation status (rejected)', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      savedReview.moderationStatus = ModerationStatus.REJECTED
      savedReview.moderationReason = 'Inappropriate content'
      const updatedReview = await savedReview.save()

      expect(updatedReview.isVisible).toBe(false)
      expect(updatedReview.moderationReason).toBe('Inappropriate content')
    })

    it('should set visibility based on moderation status (flagged)', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      savedReview.moderationStatus = ModerationStatus.FLAGGED
      const updatedReview = await savedReview.save()

      expect(updatedReview.isVisible).toBe(false)
    })
  })

  describe('Review Instance Methods', () => {
    it('should add helpful vote', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      expect(savedReview.helpfulVotes).toBe(0)

      await savedReview.addHelpfulVote()
      
      expect(savedReview.helpfulVotes).toBe(1)
    })

    it('should report review', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()

      expect(savedReview.reportCount).toBe(0)

      await savedReview.reportReview()
      
      expect(savedReview.reportCount).toBe(1)
    })

    it('should auto-flag review when report count exceeds threshold', async () => {
      const review = new Review({
        ...validReviewData,
        moderationStatus: ModerationStatus.APPROVED
      })
      const savedReview = await review.save()

      // Report 5 times to trigger auto-flag
      for (let i = 0; i < 5; i++) {
        await savedReview.reportReview()
      }

      expect(savedReview.reportCount).toBe(5)
      expect(savedReview.moderationStatus).toBe(ModerationStatus.FLAGGED)
      expect(savedReview.isVisible).toBe(false)
    })

    it('should moderate review', async () => {
      const review = new Review(validReviewData)
      const savedReview = await review.save()
      const moderatorId = new mongoose.Types.ObjectId()

      await savedReview.moderate(ModerationStatus.APPROVED, 'Review approved', moderatorId)

      expect(savedReview.moderationStatus).toBe(ModerationStatus.APPROVED)
      expect(savedReview.moderationReason).toBe('Review approved')
      expect(savedReview.moderatedBy).toEqual(moderatorId)
      expect(savedReview.moderatedAt).toBeDefined()
    })
  })

  describe('Review Static Methods', () => {
    beforeEach(async () => {
      // Create test reviews for static method testing
      const productId = new mongoose.Types.ObjectId()
      
      const reviews = [
        {
          userId: new mongoose.Types.ObjectId(),
          productId: productId,
          rating: 5,
          title: 'Excellent',
          moderationStatus: ModerationStatus.APPROVED
        },
        {
          userId: new mongoose.Types.ObjectId(),
          productId: productId,
          rating: 4,
          title: 'Good',
          moderationStatus: ModerationStatus.APPROVED
        },
        {
          userId: new mongoose.Types.ObjectId(),
          productId: productId,
          rating: 3,
          title: 'Average',
          moderationStatus: ModerationStatus.APPROVED
        },
        {
          userId: new mongoose.Types.ObjectId(),
          productId: productId,
          rating: 1,
          title: 'Bad',
          moderationStatus: ModerationStatus.REJECTED // This should not be included
        }
      ]

      await Review.insertMany(reviews)
    })

    it('should calculate average rating for a product', async () => {
      const productId = (await Review.findOne())!.productId
      const result = await Review.getAverageRating(productId)

      expect(result.averageRating).toBe(4.0) // (5 + 4 + 3) / 3 = 4.0
      expect(result.totalReviews).toBe(3) // Only approved reviews
    })

    it('should return zero rating for product with no approved reviews', async () => {
      const nonExistentProductId = new mongoose.Types.ObjectId()
      const result = await Review.getAverageRating(nonExistentProductId)

      expect(result.averageRating).toBe(0)
      expect(result.totalReviews).toBe(0)
    })

    it('should get product reviews with pagination', async () => {
      const productId = (await Review.findOne())!.productId
      const reviews = await Review.getProductReviews(productId, { page: 1, limit: 2 })

      expect(reviews).toHaveLength(2) // Only 2 reviews due to limit
      expect(reviews.every(review => review.moderationStatus === ModerationStatus.APPROVED)).toBe(true)
    })

    it('should get product reviews including moderated ones', async () => {
      const productId = (await Review.findOne())!.productId
      const reviews = await Review.getProductReviews(productId, { includeModerated: true })

      expect(reviews).toHaveLength(4) // All reviews including rejected one
    })
  })

  describe('Review Validation Edge Cases', () => {
    it('should not allow negative helpful votes', async () => {
      const reviewData = { ...validReviewData, helpfulVotes: -1 }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Helpful votes cannot be negative')
    })

    it('should not allow negative report count', async () => {
      const reviewData = { ...validReviewData, reportCount: -1 }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Report count cannot be negative')
    })

    it('should validate moderation reason length', async () => {
      const reviewData = { 
        ...validReviewData, 
        moderationReason: 'A'.repeat(501) // 501 characters
      }

      const review = new Review(reviewData)
      
      await expect(review.save()).rejects.toThrow('Moderation reason cannot exceed 500 characters')
    })

    it('should trim whitespace from title and comment', async () => {
      const reviewData = {
        ...validReviewData,
        title: '  Great product!  ',
        comment: '  This is an amazing product.  '
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.title).toBe('Great product!')
      expect(savedReview.comment).toBe('This is an amazing product.')
    })
  })
})