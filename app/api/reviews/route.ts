import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import Order, { OrderStatus, PaymentStatus } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// POST /api/reviews - Submit a product review
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = authResult.userId
    const body = await request.json()
    const { productId, rating, title, comment } = body

    // Validate required fields
    if (!productId || !rating) {
      return NextResponse.json(
        { error: 'Product ID and rating are required' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate content (either title or comment required)
    if (!title && !comment) {
      return NextResponse.json(
        { error: 'Review must have either a title or comment' },
        { status: 400 }
      )
    }

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId)
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    // Check if user has purchased this product
    const purchaseOrder = await Order.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      'items.productId': new mongoose.Types.ObjectId(productId),
      paymentStatus: PaymentStatus.PAID,
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] }
    })

    // Validate content length
    if (title && title.length > 100) {
      return NextResponse.json(
        { error: 'Review title cannot exceed 100 characters' },
        { status: 400 }
      )
    }

    if (comment && comment.length > 2000) {
      return NextResponse.json(
        { error: 'Review comment cannot exceed 2000 characters' },
        { status: 400 }
      )
    }

    // Create review data
    const reviewData = {
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId),
      rating,
      title: title?.trim(),
      comment: comment?.trim(),
      isVerifiedPurchase: !!purchaseOrder,
      orderId: purchaseOrder?._id,
      moderationStatus: ModerationStatus.PENDING
    }

    // Create the review
    const review = new Review(reviewData)
    await review.save()

    // Return the created review (excluding sensitive fields)
    const reviewResponse = {
      id: review._id,
      productId: review.productId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      moderationStatus: review.moderationStatus,
      helpfulVotes: review.helpfulVotes,
      createdAt: review.createdAt
    }

    return NextResponse.json({
      message: 'Review submitted successfully',
      review: reviewResponse
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting review:', error)
    
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Handle duplicate key error (should not happen due to pre-check, but just in case)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}