import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { updateOrderStatus, getOrderById } from '@/lib/orders/service'
import { OrderStatus } from '@/lib/db/models/Order'
import mongoose from 'mongoose'

// PUT /api/orders/[id]/status - Update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    await connectDB()

    // Verify authentication
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const body = await request.json()
    const { status, cancelReason } = body

    // Validate order ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    // Validate status
    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid order status is required' },
        { status: 400 }
      )
    }

    // Get the current order to check ownership and current status
    const currentOrder = await getOrderById(id, authResult.userId!)
    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Validate status transitions for regular users
    // Users can only cancel their own orders and only if they're in certain states
    const allowedUserTransitions = [
      { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED },
      { from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED }
    ]

    const isValidUserTransition = allowedUserTransitions.some(
      transition => 
        currentOrder.status === transition.from && 
        status === transition.to
    )

    if (!isValidUserTransition) {
      return NextResponse.json(
        { 
          error: 'Invalid status transition',
          message: `Cannot change order status from ${currentOrder.status} to ${status}`
        },
        { status: 400 }
      )
    }

    // Validate cancel reason if cancelling
    if (status === OrderStatus.CANCELLED && !cancelReason) {
      return NextResponse.json(
        { error: 'Cancel reason is required when cancelling an order' },
        { status: 400 }
      )
    }

    // Update the order status
    const updatedOrder = await updateOrderStatus(id, status, cancelReason)

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      )
    }

    // Send order status update email
    try {
      const { emailNotificationService } = await import('@/lib/email');
      const User = (await import('@/lib/db/models/User')).default;
      
      const user = await User.findById(authResult.userId);
      if (user) {
        const statusMessages = {
          [OrderStatus.PENDING]: 'Your order has been received and is being processed.',
          [OrderStatus.CONFIRMED]: 'Your order has been confirmed and is being prepared for shipment.',
          [OrderStatus.PROCESSING]: 'Your order is currently being processed.',
          [OrderStatus.SHIPPED]: 'Your order has been shipped and is on its way to you!',
          [OrderStatus.DELIVERED]: 'Your order has been delivered successfully.',
          [OrderStatus.CANCELLED]: `Your order has been cancelled. ${cancelReason ? `Reason: ${cancelReason}` : ''}`
        };

        await emailNotificationService.queueOrderStatusUpdate(user.email, {
          customerName: `${user.firstName} ${user.lastName}`,
          orderNumber: updatedOrder.orderNumber,
          status: status,
          statusMessage: statusMessages[status as OrderStatus] || 'Your order status has been updated.',
          trackingUrl: updatedOrder.trackingNumber ? 
            `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${updatedOrder._id}` : 
            undefined
        });

        // Schedule review request if order is delivered
        if (status === OrderStatus.DELIVERED) {
          const { emailJobService } = await import('@/lib/email/jobs');
          await emailJobService.scheduleReviewRequestForOrder(updatedOrder._id.toString(), 72); // 3 days delay
        }
      }
    } catch (emailError) {
      console.error('Failed to send order status update email:', emailError);
      // Don't fail status update if email fails
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: {
        id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        cancelReason: updatedOrder.cancelReason,
        updatedAt: updatedOrder.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}