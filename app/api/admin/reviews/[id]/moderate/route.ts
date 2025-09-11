import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// PUT /api/admin/reviews/[id]/moderate - Moderate a review (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Verify authentication
    const authResult = await authenticateToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // TODO: Add admin role check when user roles are implemented
    // For now, we'll assume authenticated users can access this endpoint
    // In production, you should verify the user has admin privileges

    const { id: reviewId } = await params

    const body = await request.json()
    const { status, reason } = body

    // Validate reviewId format
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID format' },
        { status: 400 }
      )
    }

    // Validate moderation status
    if (!status || !Object.values(ModerationStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid moderation status is required' },
        { status: 400 }
      )
    }

    // Validate reason for rejection or flagging
    if ((status === ModerationStatus.REJECTED || status === ModerationStatus.FLAGGED) && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection or flagging' },
        { status: 400 }
      )
    }

    // Validate reason length
    if (reason && reason.length > 500) {
      return NextResponse.json(
        { error: 'Moderation reason cannot exceed 500 characters' },
        { status: 400 }
      )
    }

    // Find the review
    const review = await Review.findById(reviewId)
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Moderate the review
    await review.moderate(
      status as ModerationStatus,
      reason?.trim(),
      new mongoose.Types.ObjectId(authResult.userId)
    )

    // Return updated review
    const updatedReview = {
      id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      moderationStatus: review.moderationStatus,
      moderationReason: review.moderationReason,
      moderatedAt: review.moderatedAt,
      moderatedBy: review.moderatedBy,
      isVisible: review.isVisible,
      helpfulVotes: review.helpfulVotes,
      reportCount: review.reportCount,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }

    return NextResponse.json({
      message: 'Review moderated successfully',
      review: updatedReview
    })

  } catch (error) {
    console.error('Error moderating review:', error)
    
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}