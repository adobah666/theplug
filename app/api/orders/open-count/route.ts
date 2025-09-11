import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Order, { OrderStatus } from '@/lib/db/models/Order'
import mongoose from 'mongoose'

// GET /api/orders/open-count - Get count of user's orders that are not yet delivered (confirmed or processing)
export async function GET(_req: NextRequest) {
  try {
    await connectDB()

    // Determine user ID from either Authorization header or NextAuth session
    let authedUserId: string | null = null

    // Try bearer token first
    const authResult = await authenticateToken(_req)
    if (authResult.success && authResult.userId) {
      authedUserId = authResult.userId
    }

    // Fallback to session
    if (!authedUserId) {
      const session = await getServerSession(authOptions as any)
      const sUser = (session?.user ?? null) as any
      const sid = sUser?.id || sUser?._id || null
      if (sid) authedUserId = String(sid)
    }

    if (!authedUserId || !mongoose.Types.ObjectId.isValid(authedUserId)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userObjectId = new mongoose.Types.ObjectId(authedUserId)

    const count = await Order.countDocuments({
      userId: userObjectId,
      status: { $in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] }
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error getting open orders count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
