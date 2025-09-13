import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Order, { PaymentStatus, OrderStatus } from '@/lib/db/models/Order'
import RefundRequest, { IRefundRequest } from '@/lib/db/models/RefundRequest'

// POST /api/orders/[id]/refund-request
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Must belong to user
    if (String(order.userId) !== String((session.user as any).id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow refund on paid orders
    if (order.paymentStatus !== PaymentStatus.PAID) {
      return NextResponse.json({ error: 'Refund not available for unpaid orders' }, { status: 400 })
    }

    // Within 6 hours of paidAt
    const paidAt = order.paidAt ? new Date(order.paidAt) : null
    if (!paidAt) {
      return NextResponse.json({ error: 'Refund window not available' }, { status: 400 })
    }
    const now = new Date()
    const hoursSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
    if (hoursSincePaid > 6) {
      return NextResponse.json({ error: 'Refund window (6 hours) has expired' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({} as any))
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : undefined

    // Upsert-like behavior
    const existing = await RefundRequest.findOne({ orderId: order._id, userId: order.userId })
    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json({ success: true, data: existing, message: 'Refund request already submitted' })
      }
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Refund already approved for this order' }, { status: 400 })
      }
      // If previously rejected, allow user to resubmit within window by resetting to pending
      existing.status = 'pending'
      if (typeof reason === 'string') existing.reason = reason
      await existing.save()
      return NextResponse.json({ success: true, data: existing, message: 'Refund request resubmitted' })
    }

    const rr = await RefundRequest.create({ orderId: order._id, userId: order.userId, reason, status: 'pending' })

    return NextResponse.json({ success: true, data: rr })
  } catch (err) {
    console.error('Refund request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/orders/[id]/refund-request
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Must belong to user
    if (String(order.userId) !== String((session.user as any).id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await RefundRequest
      .findOne({ orderId: order._id, userId: order.userId })
      .lean<{
        _id: any;
        orderId: any;
        userId: any;
        reason?: string;
        status: 'pending' | 'approved' | 'rejected';
        createdAt: Date;
        updatedAt: Date;
      }>()
    if (!existing) {
      return NextResponse.json({ success: true, exists: false }, { headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json({
      success: true,
      exists: true,
      status: existing.status,
      data: {
        _id: String(existing._id),
        orderId: String(existing.orderId),
        userId: String(existing.userId),
        reason: existing.reason ?? null,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      }
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Refund request get error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
