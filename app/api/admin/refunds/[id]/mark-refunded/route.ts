import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import RefundRequest from '@/lib/db/models/RefundRequest'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import { emailService } from '@/lib/email/service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const rr = await RefundRequest.findById(id)
    if (!rr) return NextResponse.json({ success: false, error: 'Refund request not found' }, { status: 404 })
    if (rr.status !== 'pending') return NextResponse.json({ success: false, error: 'Refund request already processed' }, { status: 400 })

    const order = await Order.findById(rr.orderId).populate('userId', 'email firstName lastName phone').exec()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    // Mark request approved and order refunded (without calling Paystack)
    rr.status = 'approved'
    await rr.save()

    order.paymentStatus = PaymentStatus.REFUNDED
    await order.save()

    // Restore inventory
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
      console.error('Failed to restore inventory on manual refund:', restockErr)
    }

    // Email and SMS customer
    try {
      const to = ((order.userId as any)?.email as string) || ''
      const user = order.userId as any;
      
      if (to) {
        await emailService.sendEmail({
          to,
          subject: 'Your refund has been processed',
          html: `<p>Hello,</p><p>Your refund request for order <strong>${order.orderNumber || order._id}</strong> has been approved and processed. You should receive your refund within 1-2 business days.</p>`,
          text: `Your refund request for order ${order.orderNumber || order._id} has been approved and processed. You should receive your refund within 1-2 business days.`,
        })
      }

      // Send SMS notification for refund approval
      const phoneNumber = user?.phone || order.shippingAddress.recipientPhone;
      if (phoneNumber) {
        const { smsQueue } = await import('@/lib/sms/queue');
        
        const customerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';
        const smsContent = `Hi ${customerName}! Your refund for order ${order.orderNumber} (GHS ${order.total.toFixed(2)}) has been processed. You should receive it within 1-2 business days. - ThePlug`;

        await smsQueue.addToQueue({
          to: phoneNumber,
          content: smsContent,
          type: 'REFUND_APPROVED',
          priority: 1,
          userId: String(order.userId),
          orderId: String(order._id),
          recipientId: String(order.userId)
        });
      }
    } catch (e) {
      console.error('Failed to send refund notifications:', e)
    }

    return NextResponse.json({ success: true, message: 'Marked as refunded', data: { refund: rr, orderId: order._id } })
  } catch (err) {
    console.error('Admin mark refunded error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
