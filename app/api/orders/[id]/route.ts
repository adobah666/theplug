import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { getOrderById } from '@/lib/orders/service'
import mongoose from 'mongoose'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

// GET /api/orders/[id] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    // Verify authentication via NextAuth session or Authorization header
    let userId: string | null = null
    const session = await getServerSession(authOptions)
    if (session && (session.user as any)?.id) {
      userId = (session.user as any).id
    } else {
      const authResult = await authenticateToken(request)
      if (authResult.success && authResult.userId) {
        userId = authResult.userId
      }
    }

    if (!userId) {
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
    const order = await getOrderById(id, userId!)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Return in shape expected by app/orders/[id]/page.ts
    return NextResponse.json({ data: order })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}