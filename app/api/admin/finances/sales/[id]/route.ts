import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions as any)
    // @ts-expect-error session typing
    const role = (session?.user as any)?.role
    if (!session || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { id } = await context.params
    const order: any = await Order.findById(id)
      .populate('userId', 'firstName lastName email')
      .lean()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const details = {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      user: {
        name: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`.trim(),
        email: order.userId?.email || '',
      },
      items: order.items?.map((i: any) => ({
        productId: i.productId?.toString?.() || '',
        productName: i.productName,
        productImage: i.productImage,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        size: i.size,
        color: i.color,
        variantId: i.variantId,
      })) || [],
      pricing: {
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        shipping: order.shipping || 0,
        discount: order.discount || 0,
        total: order.total || 0,
      },
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentDetails || null,
      createdAt: order.createdAt,
      shippingAddress: order.shippingAddress || null,
    }

    return NextResponse.json(details)
  } catch (err) {
    console.error('GET /api/admin/finances/sales/[id] error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
