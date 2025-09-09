import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import ProductEvent from '@/lib/db/models/ProductEvent'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ApiResponse } from '@/types'

// POST /api/products/[id]/analytics
// Body: { event: 'view' | 'add_to_cart' | 'purchase' }
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()

    const { id } = 'then' in (context.params as any)
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string })

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid product ID format' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userId = (session && (session.user as any)?.id) ? new mongoose.Types.ObjectId((session.user as any).id) : undefined

    const body = await request.json().catch(() => ({})) as { event?: string, quantity?: number }
    const evt = (body?.event || '').toLowerCase()
    const qty = Math.max(1, Number(body?.quantity || 1))

    if (evt === 'purchase') {
      // Purchases are only counted after successful order completion
      return NextResponse.json<ApiResponse>({ success: false, error: 'Purchase events are recorded on order completion' }, { status: 400 })
    }

    let update: Record<string, any> | null = null
    if (evt === 'view') update = { $inc: { views: 1, popularityScore: 0.2 } }
    else if (evt === 'add_to_cart') update = { $inc: { addToCartCount: qty, popularityScore: 2 * qty } }

    if (!update) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid analytics event' }, { status: 400 })
    }

    // Update counters
    const updated = await Product.findByIdAndUpdate(id, update, { new: true })
    if (!updated) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Log event for time-series analytics
    try {
      await ProductEvent.create({ productId: updated._id, type: evt as any, quantity: qty, userId })
    } catch {}

    return NextResponse.json<ApiResponse>({ success: true, data: { product: { _id: updated._id, views: updated.views, addToCartCount: updated.addToCartCount, purchaseCount: updated.purchaseCount } } })
  } catch (error) {
    console.error('Product analytics error:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to record analytics' }, { status: 500 })
  }
}
