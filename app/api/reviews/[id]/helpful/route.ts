import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// POST /api/reviews/[id]/helpful - Mark a review as helpful
export async function POST(
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

    const { id: reviewId } = await params

    // Validate reviewId format
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID format' },
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

    // Check if review is approved and visible
    if (review.moderationStatus !== ModerationStatus.APPROVED || !review.isVisible) {
      return NextResponse.json(
        { error: 'Review not available' },
        { status: 404 }
      )
    }

    // Check if user is trying to vote on their own review
    if (review.userId.toString() === authResult.userId) {
      return NextResponse.json(
        { error: 'Cannot vote on your own review' },
        { status: 400 }
      )
    }

    // Add helpful vote
    await review.addHelpfulVote()

    return NextResponse.json({
      message: 'Review marked as helpful',
      helpfulVotes: review.helpfulVotes
    })

  } catch (error) {
    console.error('Error marking review as helpful:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}