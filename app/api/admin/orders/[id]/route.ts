import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'
import { smsQueue } from '@/lib/sms/queue'
import { emailService } from '@/lib/email/service'

// PATCH /api/admin/orders/[id] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, trackingNumber, estimatedDelivery } = body

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Status is required'
      }, { status: 400 })
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status'
      }, { status: 400 })
    }

    await connectDB()

    const updateData: any = { status }
    
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber
    }
    
    if (estimatedDelivery) {
      updateData.estimatedDelivery = new Date(estimatedDelivery)
    } else if (status === 'shipped' && !estimatedDelivery) {
      // Auto-set estimated delivery to 3-5 days from now when shipped
      const deliveryDate = new Date()
      deliveryDate.setDate(deliveryDate.getDate() + 4) // 4 days average
      updateData.estimatedDelivery = deliveryDate
    }

    // Auto-generate a tracking number if moving to shipped without one
    if (status === 'shipped' && !updateData.trackingNumber) {
      const ts = new Date()
      const y = ts.getFullYear()
      const m = String(ts.getMonth() + 1).padStart(2, '0')
      const d = String(ts.getDate()).padStart(2, '0')
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
      updateData.trackingNumber = `TPG-${y}${m}${d}-${rand}`
    }

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'email name phone')

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 })
    }

    // Fire-and-forget notifications (best-effort; do not block response)
    ;(async () => {
      try {
        const o: any = order
        const statusLc = String(o.status || '').toLowerCase()
        const orderNumber = o.orderNumber || String(o._id).slice(-8)
        const email = o?.userId?.email
        const phone: string | undefined = o?.userId?.phone || o?.shippingAddress?.recipientPhone || o?.shippingAddress?.phone
        const customerName = (o?.userId?.name) || `${o?.shippingAddress?.firstName || ''} ${o?.shippingAddress?.lastName || ''}`.trim() || 'Customer'
        const trackingNumber: string | undefined = o?.trackingNumber
        const etaDate: Date | undefined = o?.estimatedDelivery ? new Date(o.estimatedDelivery) : undefined
        const today = new Date()
        const etaDays = etaDate ? Math.max(0, Math.ceil((etaDate.getTime() - today.getTime()) / (1000*60*60*24))) : undefined

        let smsContent: string | null = null
        let emailSubject = ''
        let emailBodyText = ''
        let emailBodyHtml = ''

        if (statusLc === 'processing') {
          const etaText = etaDate ? `${etaDays} day${(etaDays||0)===1?'':'s'} (by ${etaDate.toLocaleDateString()})` : 'soon'
          smsContent = `Hi ${customerName}! Your order ${orderNumber} is now processing. Estimated delivery: ${etaText}. We'll notify you when it ships. - ThePlug`
          emailSubject = `Your order ${orderNumber} is now processing`
          emailBodyText = `Hi ${customerName},\n\nYour order ${orderNumber} is now processing. Estimated delivery: ${etaText}. We'll notify you when it ships.\n\nThank you for shopping at ThePlug!`
          emailBodyHtml = `<p>Hi ${customerName},</p><p>Your order <strong>${orderNumber}</strong> is now <strong>processing</strong>.</p><p>Estimated delivery: <strong>${etaText}</strong>.</p><p>We'll notify you when it ships.</p><p>Thank you for shopping at <strong>ThePlug</strong>!</p>`
        } else if (statusLc === 'shipped') {
          const etaText = etaDate ? `Estimated delivery by ${etaDate.toLocaleDateString()}.` : ''
          const trackText = trackingNumber ? ` Tracking: ${trackingNumber}.` : ''
          smsContent = `Hi ${customerName}! Your order ${orderNumber} has shipped.${trackText} ${etaText} - ThePlug`
          emailSubject = `Your order ${orderNumber} has shipped`
          emailBodyText = `Hi ${customerName},\n\nYour order ${orderNumber} has shipped.${trackText ? ` ${trackText}` : ''} ${etaText}\n\nThank you for shopping at ThePlug!`
          emailBodyHtml = `<p>Hi ${customerName},</p><p>Your order <strong>${orderNumber}</strong> has <strong>shipped</strong>.</p><p>${trackText || ''} ${etaText}</p><p>Thank you for shopping at <strong>ThePlug</strong>!</p>`
        } else if (statusLc === 'delivered') {
          smsContent = `Hi ${customerName}! Your order ${orderNumber} has been delivered. We hope you love it! - ThePlug`
          emailSubject = `Your order ${orderNumber} was delivered`
          emailBodyText = `Hi ${customerName},\n\nYour order ${orderNumber} has been delivered. We hope you love your purchase!\n\n- ThePlug`
          emailBodyHtml = `<p>Hi ${customerName},</p><p>Your order <strong>${orderNumber}</strong> has been <strong>delivered</strong>. We hope you love your purchase!</p><p>- ThePlug</p>`
        }

        // Queue SMS if we have content and a valid phone
        if (smsContent && phone) {
          try {
            await smsQueue.addToQueue({
              to: phone,
              content: smsContent,
              type: statusLc === 'delivered' ? 'ORDER_DELIVERED' : statusLc === 'shipped' ? 'ORDER_SHIPPED' : 'MANUAL',
              recipientId: String(o?.userId?._id || ''),
              orderId: String(o?._id || ''),
            })
          } catch (e) {
            console.warn('Order status SMS queue failed:', e)
          }
        }

        // Send email if available
        if (email && emailSubject) {
          try {
            await emailService.sendEmail({
              to: email,
              subject: emailSubject,
              text: emailBodyText,
              html: emailBodyHtml,
            })
          } catch (e) {
            console.warn('Order status email send failed:', e)
          }
        }
      } catch (notifyErr) {
        console.warn('Order status notifications error:', notifyErr)
      }
    })()

    return NextResponse.json({
      success: true,
      data: order
    })

  } catch (error) {
    console.error('Admin order update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update order'
    }, { status: 500 })
  }
}
