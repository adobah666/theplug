import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import RefundRequest from '@/lib/db/models/RefundRequest'
import Order from '@/lib/db/models/Order'
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

    rr.status = 'rejected'
    await rr.save()

    // Notify customer
    try {
      const to = ((order?.userId as any)?.email as string) || ''
      if (to) {
        await emailService.sendEmail({
          to,
          subject: 'Your refund request was rejected',
          html: `<p>Hello,</p><p>Your refund request for order <strong>${order?.orderNumber || order?._id}</strong> was rejected. If you have questions, reply to this email.</p>`,
          text: `Your refund request for order ${order?.orderNumber || order?._id} was rejected. If you have questions, reply to this email.`,
        })
      }
    } catch (e) {
      console.error('Failed to send refund rejection email:', e)
    }

    return NextResponse.json({ success: true, message: 'Refund rejected', data: { refund: rr, orderId: order?._id } })
  } catch (err) {
    console.error('Admin reject refund error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
