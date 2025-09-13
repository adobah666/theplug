import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import RefundRequest from '@/lib/db/models/RefundRequest'
import Order from '@/lib/db/models/Order'

// GET /api/admin/refunds - list pending refund requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const requests = await RefundRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean()

    // Get minimal order/user info for display
    const orderIds = requests.map(r => r.orderId)
    const orders = await Order.find({ _id: { $in: orderIds } })
      .select('_id orderNumber total userId paystackReference createdAt')
      .populate('userId', 'email firstName lastName')
      .lean()

    const orderMap = new Map(orders.map((o: any) => [String(o._id), o]))

    const data = requests.map((r: any) => ({
      _id: String(r._id),
      orderId: String(r.orderId),
      userId: String(r.userId),
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      order: orderMap.get(String(r.orderId)) || null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Admin refunds fetch error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch refunds' }, { status: 500 })
  }
}
