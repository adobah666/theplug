import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'

// GET /api/admin/orders - Get all orders for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    await connectDB()

    const orders = await Order.find({})
      .populate('userId', 'email name phone')
      .sort({ createdAt: -1 })
      .lean()

    // Ensure phone is present: fallback to shippingAddress.recipientPhone
    const normalized = orders.map((o: any) => {
      if (o && o.userId) {
        o.userId = {
          ...o.userId,
          phone: o?.userId?.phone || o?.shippingAddress?.recipientPhone || o?.shippingAddress?.phone || null,
        }
      }
      return o
    })

    return NextResponse.json({
      success: true,
      data: normalized
    })

  } catch (error) {
    console.error('Admin orders fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch orders'
    }, { status: 500 })
  }
}
