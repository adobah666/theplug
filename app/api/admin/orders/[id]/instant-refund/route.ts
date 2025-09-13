import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import RefundRequest from '@/lib/db/models/RefundRequest'
import { refundPayment } from '@/lib/paystack/refund'
import { emailService } from '@/lib/email/service'

// POST /api/admin/orders/[id]/instant-refund
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const order = await Order.findById(id).populate('userId', 'email firstName lastName').exec()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const statusLc = String(order.status || '').toLowerCase()
    const payLc = String(order.paymentStatus || '').toLowerCase()

    // Only allow instant refund if order is paid and not yet started processing
    if (payLc !== 'paid') {
      return NextResponse.json({ success: false, error: 'Order is not paid' }, { status: 400 })
    }
    if (!(statusLc === 'pending' || statusLc === 'confirmed')) {
      return NextResponse.json({ success: false, error: 'Instant refund allowed only before processing' }, { status: 400 })
    }

    const reference = order.paystackReference
    if (!reference) return NextResponse.json({ success: false, error: 'Order has no payment reference to refund' }, { status: 400 })

    const amountKobo = Math.round(Number(order.total) * 100)
    const refundRes = await refundPayment(reference, amountKobo)
    if (!refundRes.status) {
      return NextResponse.json({ success: false, error: refundRes.message || 'Refund failed' }, { status: 400 })
    }

    // Mark order refunded and cancelled
    order.paymentStatus = PaymentStatus.REFUNDED
    order.status = 'cancelled'
    await order.save()

    // Restore inventory for each item
    try {
      for (const it of (order.items as any[])) {
        const product = await Product.findById(it.productId)
        if (!product) continue
        if (it.variantId) {
          const variant = (product.variants as any[])?.find((v: any) => v._id?.toString() === String(it.variantId))
          if (variant) {
            variant.inventory = Math.max(0, Number(variant.inventory || 0) + Number(it.quantity || 0))
          }
        } else {
          product.inventory = Math.max(0, Number(product.inventory || 0) + Number(it.quantity || 0))
        }
        await product.save()
      }
    } catch (restockErr) {
      console.error('Instant refund: failed to restore inventory:', restockErr)
    }

    // Create or update RefundRequest as approved for audit trail
    try {
      const existing = await RefundRequest.findOne({ orderId: order._id, userId: order.userId })
      if (existing) {
        existing.status = 'approved'
        existing.reason = existing.reason || 'Admin instant refund before processing.'
        await existing.save()
      } else {
        await RefundRequest.create({
          orderId: order._id,
          userId: order.userId as any,
          status: 'approved',
          reason: 'Admin instant refund before processing.'
        })
      }
    } catch (auditErr) {
      console.error('Instant refund: failed to write RefundRequest audit:', auditErr)
    }

    // Email customer
    try {
      const to = ((order.userId as any)?.email as string) || ''
      if (to) {
        await emailService.sendEmail({
          to,
          subject: 'Your order has been refunded',
          html: `<p>Hello,</p><p>Your order <strong>${order.orderNumber || order._id}</strong> has been refunded in full as it had not entered processing. Funds are being returned via Paystack.</p>`,
          text: `Your order ${order.orderNumber || order._id} has been refunded in full as it had not entered processing. Funds are being returned via Paystack.`,
        })
      }
    } catch (e) {
      console.error('Instant refund: failed to send email:', e)
    }

    return NextResponse.json({ success: true, message: 'Instant refund processed', data: { orderId: order._id } })
  } catch (err) {
    console.error('Admin instant refund error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
