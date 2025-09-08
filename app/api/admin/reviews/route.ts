import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import { getReviewsForModeration } from '@/lib/reviews/service'
import { authenticateToken } from '@/lib/auth/middleware'

// GET /api/admin/reviews - Get reviews for moderation (admin only)
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication and admin role via NextAuth session first
    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      // Fallback to JWT Authorization header auth
      const authResult = await authenticateToken(request)
      if (!authResult.success || !authResult.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      if (authResult.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin privileges required' },
          { status: 403 }
        )
      }
    }

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