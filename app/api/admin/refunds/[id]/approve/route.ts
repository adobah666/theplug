import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import RefundRequest from '@/lib/db/models/RefundRequest'
import Order, { PaymentStatus } from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import { refundPayment } from '@/lib/paystack/refund'
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

    const order = await Order.findById(rr.orderId).populate('userId', 'email firstName lastName').exec()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    // Attempt refund via Paystack (full amount)
    const reference = order.paystackReference
    if (!reference) return NextResponse.json({ success: false, error: 'Order has no payment reference to refund' }, { status: 400 })

    const amountKobo = Math.round(Number(order.total) * 100)
    const refundRes = await refundPayment(reference, amountKobo)
    if (!refundRes.status) {
      return NextResponse.json({ success: false, error: refundRes.message || 'Refund failed' }, { status: 400 })
    }

    // Mark request approved and order refunded
    rr.status = 'approved'
    await rr.save()

    order.paymentStatus = PaymentStatus.REFUNDED
    await order.save()

    // Restore inventory only for legit refunds (order had been paid; stock was reserved earlier)
    try {
      if (String(order.paymentStatus).toLowerCase() === 'refunded') {
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
      }
    } catch (restockErr) {
      console.error('Failed to restore inventory on refund approval:', restockErr)
    }

    // Email and SMS customer
    try {
      const to = ((order.userId as any)?.email as string) || ''
      const user = order.userId as any;
      
      if (to) {
        await emailService.sendEmail({
          to,
          subject: 'Your refund has been approved',
          html: `<p>Hello,</p><p>Your refund request for order <strong>${order.orderNumber || order._id}</strong> has been approved. The refund is being processed by Paystack.</p>` ,
          text: `Your refund request for order ${order.orderNumber || order._id} has been approved. The refund is being processed by Paystack.`,
        })
      }

      // Send SMS notification for refund approval
      const phoneNumber = user?.phone || order.shippingAddress.recipientPhone;
      if (phoneNumber) {
        const { smsQueue } = await import('@/lib/sms/queue');
        const { SMSService } = await import('@/lib/sms/service');
        
        const customerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';
        const smsContent = SMSService.getRefundApprovedMessage(customerName, order.orderNumber, order.total);

        await smsQueue.addToQueue({
          to: phoneNumber,
          content: smsContent,
          type: 'REFUND_APPROVED',
          priority: 1, // High priority for refund approvals
          userId: String(order.userId),
          orderId: String(order._id),
          recipientId: String(order.userId)
        });
      }
    } catch (e) {
      console.error('Failed to send refund approval notifications:', e)
    }

    return NextResponse.json({ success: true, message: 'Refund approved', data: { refund: rr, orderId: order._id } })
  } catch (err) {
    console.error('Admin approve refund error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
