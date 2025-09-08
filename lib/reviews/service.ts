import Review, { ModerationStatus } from '@/lib/db/models/Review'
import Product from '@/lib/db/models/Product'
import mongoose from 'mongoose'

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
}

export interface ReviewFilters {
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating' | 'most-helpful'
  rating?: number
  verified?: boolean
}

/**
 * Calculate and cache average rating for a product
 */
export async function calculateProductRating(productId: mongoose.Types.ObjectId): Promise<ReviewStats> {
  const result = await Review.aggregate([
    {
      $match: {
        productId: productId,
        moderationStatus: ModerationStatus.APPROVED,
        isVisible: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ])

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  }

  // Calculate rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  result[0].ratingDistribution.forEach((rating: number) => {
    ratingDistribution[rating as keyof typeof ratingDistribution]++
  })

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
    totalReviews: result[0].totalReviews,
    ratingDistribution
  }
}

/**
 * Update product rating in the product document
 */
export async function updateProductRating(productId: mongoose.Types.ObjectId): Promise<void> {
  const stats = await calculateProductRating(productId)
  
  await Product.findByIdAndUpdate(productId, {
    rating: stats.averageRating,
    reviewCount: stats.totalReviews
  })
}

/**
 * Get paginated reviews for a product
 */
export async function getProductReviews(
  productId: mongoose.Types.ObjectId,
  filters: ReviewFilters = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'newest',
    rating,
    verified
  } = filters

  // Build match conditions
  const matchConditions: any = {
    productId: productId,
    moderationStatus: ModerationStatus.APPROVED,
    isVisible: true
  }

  // Add rating filter if specified
  if (rating && rating >= 1 && rating <= 5) {
    matchConditions.rating = rating
  }

  // Add verified purchase filter if specified
  if (verified) {
    matchConditions.isVerifiedPurchase = true
  }

  // Determine sort order
  let sortOrder: any = { createdAt: -1 } // Default: newest first
  
  switch (sortBy) {
    case 'oldest':
      sortOrder = { createdAt: 1 }
      break
    case 'highest-rating':
      sortOrder = { rating: -1, createdAt: -1 }
      break
    case 'lowest-rating':
      sortOrder = { rating: 1, createdAt: -1 }
      break
    case 'most-helpful':
      sortOrder = { helpfulVotes: -1, createdAt: -1 }
      break
    case 'newest':
    default:
      sortOrder = { createdAt: -1 }
      break
  }

  // Get reviews with pagination
  const skip = (page - 1) * Math.min(limit, 50) // Max 50 per page
  const actualLimit = Math.min(limit, 50)
  
  const [reviews, totalCount] = await Promise.all([
    // Get paginated reviews with user information
    Review.aggregate([
      { $match: matchConditions },
      { $sort: sortOrder },
      { $skip: skip },
      { $limit: actualLimit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                // Only show first name and last initial for privacy
                displayName: {
                  $concat: [
                    { $arrayElemAt: [{ $split: ['$name', ' '] }, 0] },
                    ' ',
                    { $substr: [{ $arrayElemAt: [{ $split: ['$name', ' '] }, 1] }, 0, 1] },
                    '.'
                  ]
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          title: 1,
          comment: 1,
          isVerifiedPurchase: 1,
          helpfulVotes: 1,
          createdAt: 1,
          user: { $arrayElemAt: ['$user', 0] }
        }
      }
    ]),
    
    // Get total count for pagination
    Review.countDocuments(matchConditions)
  ])

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / actualLimit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    reviews: reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt,
      author: review.user?.displayName || 'Anonymous'
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage,
      hasPrevPage,
      limit: actualLimit
    }
  }
}

/**
 * Get reviews for admin moderation
 */
export async function getReviewsForModeration(filters: {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
} = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'pending',
    sortBy = 'newest'
  } = filters

  // Build match conditions
  const matchConditions: any = {}
  
  // Filter by moderation status
  if (status !== 'all' && Object.values(ModerationStatus).includes(status as ModerationStatus)) {
    matchConditions.moderationStatus = status
  }

  // Determine sort order
  let sortOrder: any = { createdAt: -1 } // Default: newest first
  
  switch (sortBy) {
    case 'oldest':
      sortOrder = { createdAt: 1 }
      break
    case 'highest-rating':
      sortOrder = { rating: -1, createdAt: -1 }
      break
    case 'lowest-rating':
      sortOrder = { rating: 1, createdAt: -1 }
      break
    case 'most-reported':
      sortOrder = { reportCount: -1, createdAt: -1 }
      break
    case 'newest':
    default:
      sortOrder = { createdAt: -1 }
      break
  }

  // Get reviews with pagination
  const skip = (page - 1) * Math.min(limit, 100)
  const actualLimit = Math.min(limit, 100)
  
  const [reviews, totalCount] = await Promise.all([
    // Get paginated reviews with user and product information
    Review.aggregate([
      { $match: matchConditions },
      { $sort: sortOrder },
      { $skip: skip },
      { $limit: actualLimit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            {
              $project: {
                name: 1,
                images: { $arrayElemAt: ['$images', 0] }
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'moderatedBy',
          foreignField: '_id',
          as: 'moderator',
          pipeline: [
            {
              $project: {
                name: 1
              }
            }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          title: 1,
          comment: 1,
          isVerifiedPurchase: 1,
          moderationStatus: 1,
          moderationReason: 1,
          moderatedAt: 1,
          helpfulVotes: 1,
          reportCount: 1,
          isVisible: 1,
          createdAt: 1,
          updatedAt: 1,
          user: { $arrayElemAt: ['$user', 0] },
          product: { $arrayElemAt: ['$product', 0] },
          moderator: { $arrayElemAt: ['$moderator', 0] }
        }
      }
    ]),
    
    // Get total count for pagination
    Review.countDocuments(matchConditions)
  ])

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / actualLimit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    reviews: reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      moderationStatus: review.moderationStatus,
      moderationReason: review.moderationReason,
      moderatedAt: review.moderatedAt,
      helpfulVotes: review.helpfulVotes,
      reportCount: review.reportCount,
      isVisible: review.isVisible,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.user?._id,
        name: review.user?.name,
        email: review.user?.email
      },
      product: {
        id: review.product?._id,
        name: review.product?.name,
        image: review.product?.images
      },
      moderator: review.moderator ? {
        id: review.moderator._id,
        name: review.moderator.name
      } : null
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage,
      hasPrevPage,
      limit: actualLimit
    }
  }
}