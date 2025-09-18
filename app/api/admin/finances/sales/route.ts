import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import RefundRequest from '@/lib/db/models/RefundRequest'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    // @ts-expect-error session typing
    const role = (session?.user as any)?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10', 10), 100)
    const q = searchParams.get('q')?.trim()
    const status = searchParams.get('status') // order status filter (optional)
    const includeRefunds = (searchParams.get('includeRefunds') || 'true') === 'true'

    const match: any = {}

    // Only orders that have been paid or refunded to represent a sale
    match.paymentStatus = { $in: [PaymentStatus.PAID, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] }

    if (status) {
      match.status = status
    }

    // Text search by orderNumber
    if (q) {
      match.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
      ]
    }

    // Count total
    const total = await Order.countDocuments(match)

    // Fetch paginated orders newest first
    const orders = await Order.find(match)
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    // Attach refund info when requested
    let refundsByOrderId = new Map<string, { status: string }>()
    if (includeRefunds) {
      const orderIds = orders.map(o => o._id)
      if (orderIds.length) {
        const refunds = await RefundRequest.find({ orderId: { $in: orderIds } })
          .select('orderId status')
          .lean()
        refundsByOrderId = new Map(refunds.map(r => [r.orderId.toString(), { status: r.status }]))
      }
    }

    const items = orders.map((order: any) => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: `${order.userId?.firstName || 'Unknown'} ${order.userId?.lastName || ''}`.trim(),
      total: order.total,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      refund: includeRefunds ? refundsByOrderId.get(order._id.toString()) || null : null,
    }))

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    })
  } catch (err) {
    console.error('GET /api/admin/finances/sales error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
