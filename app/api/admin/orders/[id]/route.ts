import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'

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

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
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

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'email name')

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 })
    }

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
