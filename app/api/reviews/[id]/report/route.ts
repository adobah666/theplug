import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Review, { ModerationStatus } from '@/lib/db/models/Review'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// POST /api/reviews/[id]/report - Report a review for inappropriate content
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

    const body = await request.json()
    const { reason } = body

    // Validate reviewId format
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { error: 'Invalid review ID format' },
        { status: 400 }
      )
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Report reason is required' },
        { status: 400 }
      )
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Report reason cannot exceed 500 characters' },
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

    // Check if review is visible and approved
    if (review.moderationStatus !== ModerationStatus.APPROVED || !review.isVisible) {
      return NextResponse.json(
        { error: 'Review not available' },
        { status: 404 }
      )
    }

    // Check if user is trying to report their own review
    if (review.userId.toString() === authResult.userId) {
      return NextResponse.json(
        { error: 'Cannot report your own review' },
        { status: 400 }
      )
    }

    // Report the review
    await review.reportReview()

    // Log the report (in a real application, you might want to store individual reports)
    console.log(`Review ${reviewId} reported by user ${authResult.userId} for: ${reason}`)

    return NextResponse.json({
      message: 'Review reported successfully',
      reportCount: review.reportCount
    })

  } catch (error) {
    console.error('Error reporting review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}