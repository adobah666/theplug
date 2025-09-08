import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { getOrderById } from '@/lib/orders/service'
import mongoose from 'mongoose'

// GET /api/orders/[id] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params

    // Validate order ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    // Get order with user validation
    const order = await getOrderById(id, authResult.userId!)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}