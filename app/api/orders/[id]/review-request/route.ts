import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { getOrderById } from '@/lib/orders/service'
import { OrderStatus } from '@/lib/db/models/Order'
import mongoose from 'mongoose'

// POST /api/orders/[id]/review-request - Send review request email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    await connectDB()

    // Verify authentication (admin only for manual review requests)
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Validate order ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await getOrderById(id, authResult.userId!)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Only send review requests for delivered orders
    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Review requests can only be sent for delivered orders' },
        { status: 400 }
      )
    }

    // Send review request email
    try {
      const { emailNotificationService } = await import('@/lib/email');
      const User = (await import('@/lib/db/models/User')).default;
      
      const user = await User.findById(order.userId);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      await emailNotificationService.queueReviewRequest(user.email, {
        customerName: `${user.firstName} ${user.lastName}`,
        orderNumber: order.orderNumber,
        items: order.items.map(item => ({
          name: item.productName,
          image: item.productImage,
          reviewUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/products/${item.productId}?review=true`
        }))
      }, 0); // Send immediately for manual requests

      return NextResponse.json({
        message: 'Review request email sent successfully'
      })

    } catch (emailError) {
      console.error('Failed to send review request email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send review request email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error sending review request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}