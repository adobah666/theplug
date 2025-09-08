import mongoose, { Document, Schema } from 'mongoose'

// Moderation status enum
export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}

// Review interface extending Document
export interface IReview extends Document {
  userId: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  orderId?: mongoose.Types.ObjectId
  rating: number
  title?: string
  comment?: string
  isVerifiedPurchase: boolean
  moderationStatus: ModerationStatus
  moderationReason?: string
  moderatedBy?: mongoose.Types.ObjectId
  moderatedAt?: Date
  helpfulVotes: number
  reportCount: number
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
}

// Review schema
const ReviewSchema = new Schema<IReview>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot be more than 5 stars'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [2000, 'Review comment cannot exceed 2000 characters']
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: Object.values(ModerationStatus),
    default: ModerationStatus.PENDING,
    required: [true, 'Moderation status is required']
  },
  moderationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Moderation reason cannot exceed 500 characters']
  },
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  helpfulVotes: {
    type: Number,
    min: [0, 'Helpful votes cannot be negative'],
    default: 0
  },
  reportCount: {
    type: Number,
    min: [0, 'Report count cannot be negative'],
    default: 0
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Pre-save middleware to set verified purchase status
ReviewSchema.pre('save', async function(next) {
  // If orderId is provided, mark as verified purchase
  if (this.orderId && !this.isVerifiedPurchase) {
    this.isVerifiedPurchase = true
  }
  next()
})

// Pre-save middleware to set moderation timestamp
ReviewSchema.pre('save', function(next) {
  // Set moderatedAt when moderation status changes from pending
  if (this.isModified('moderationStatus') && 
      this.moderationStatus !== ModerationStatus.PENDING && 
      !this.moderatedAt) {
    this.moderatedAt = new Date()
  }
  next()
})

// Pre-save middleware to handle visibility based on moderation
ReviewSchema.pre('save', function(next) {
  // Set visibility based on moderation status
  if (this.moderationStatus === ModerationStatus.APPROVED) {
    this.isVisible = true
  } else if (this.moderationStatus === ModerationStatus.REJECTED || 
             this.moderationStatus === ModerationStatus.FLAGGED) {
    this.isVisible = false
  }
  next()
})

// Pre-save middleware to validate review content
ReviewSchema.pre('save', function(next) {
  // Require either title or comment
  if (!this.title && !this.comment) {
    return next(new Error('Review must have either a title or comment'))
  }
  next()
})

// Pre-save middleware to prevent duplicate reviews
ReviewSchema.pre('save', async function(next) {
  // Check for existing review by same user for same product
  if (this.isNew) {
    const existingReview = await mongoose.model('Review').findOne({
      userId: this.userId,
      productId: this.productId,
      _id: { $ne: this._id }
    })
    
    if (existingReview) {
      return next(new Error('User has already reviewed this product'))
    }
  }
  next()
})

// Instance method to mark as helpful
ReviewSchema.methods.addHelpfulVote = function() {
  this.helpfulVotes += 1
  return this.save()
}

// Instance method to report review
ReviewSchema.methods.reportReview = function() {
  this.reportCount += 1
  
  // Auto-flag if report count exceeds threshold
  if (this.reportCount >= 5 && this.moderationStatus === ModerationStatus.APPROVED) {
    this.moderationStatus = ModerationStatus.FLAGGED
    this.isVisible = false
  }
  
  return this.save()
}

// Instance method to moderate review
ReviewSchema.methods.moderate = function(status: ModerationStatus, reason?: string, moderatorId?: mongoose.Types.ObjectId) {
  this.moderationStatus = status
  this.moderationReason = reason
  this.moderatedBy = moderatorId
  this.moderatedAt = new Date()
  
  return this.save()
}

// Static method to get average rating for a product
ReviewSchema.statics.getAverageRating = async function(productId: mongoose.Types.ObjectId) {
  const result = await this.aggregate([
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
        totalReviews: { $sum: 1 }
      }
    }
  ])
  
  return result.length > 0 ? {
    averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
    totalReviews: result[0].totalReviews
  } : {
    averageRating: 0,
    totalReviews: 0
  }
}

// Static method to get reviews for a product
ReviewSchema.statics.getProductReviews = function(
  productId: mongoose.Types.ObjectId, 
  options: { 
    page?: number, 
    limit?: number, 
    sortBy?: string,
    includeModerated?: boolean 
  } = {}
) {
  const { page = 1, limit = 10, sortBy = '-createdAt', includeModerated = false } = options
  
  const matchConditions: any = {
    productId: productId
  }
  
  if (!includeModerated) {
    matchConditions.moderationStatus = ModerationStatus.APPROVED
    matchConditions.isVisible = true
  }
  
  return this.find(matchConditions)
    .sort(sortBy)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
}

// Compound index to prevent duplicate reviews
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true })

// Index for better query performance
ReviewSchema.index({ productId: 1, moderationStatus: 1, isVisible: 1 })
ReviewSchema.index({ userId: 1, createdAt: -1 })
ReviewSchema.index({ moderationStatus: 1, createdAt: -1 })
ReviewSchema.index({ rating: -1 })
ReviewSchema.index({ helpfulVotes: -1 })
ReviewSchema.index({ reportCount: -1 })

// Create and export the model
const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)

export default Review