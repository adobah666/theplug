import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { getUserOrders } from '@/lib/orders/service'
import mongoose from 'mongoose'

// GET /api/orders/user/[userId] - Get orders for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB()

    // Verify authentication
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Users can only access their own orders
    if (authResult.userId! !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const result = await getUserOrders(userId, page, limit)

    return NextResponse.json({
      orders: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    })

  } catch (error) {
    console.error('Error fetching user orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}