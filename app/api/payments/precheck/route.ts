import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Order from '@/lib/db/models/Order'
import { checkInventoryAvailability } from '@/lib/cart/validation'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { orderId } = await request.json().catch(() => ({}))
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const errors: string[] = []
    for (const it of order.items as any[]) {
      const res = await checkInventoryAvailability(String(it.productId), Number(it.quantity), it.variantId)
      if (!res.available) {
        errors.push(`${it.productName || 'Item'}: ${res.error || 'Not available'}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Precheck error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
