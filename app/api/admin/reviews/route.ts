import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { getReviewsForModeration } from '@/lib/reviews/service'
import { authenticateToken } from '@/lib/auth/middleware'

// GET /api/admin/reviews - Get reviews for moderation (admin only)
export async function GET(request: NextRequest) {
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

    // TODO: Add admin role check when user roles are implemented
    // For now, we'll assume authenticated users can access this endpoint
    // In production, you should verify the user has admin privileges

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'pending'
    const sortBy = searchParams.get('sortBy') || 'newest'

    // Get reviews for moderation
    const result = await getReviewsForModeration({
      page,
      limit,
      status,
      sortBy
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching reviews for moderation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}