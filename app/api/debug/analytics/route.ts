import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import ProductEvent from '@/lib/db/models/ProductEvent'
import { ApiResponse } from '@/types'

// GET /api/debug/analytics - Debug analytics data
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get recent products with analytics fields
    const products = await Product.find({})
      .select('_id name views addToCartCount purchaseCount popularityScore createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    // Get recent events
    const events = await ProductEvent.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    // Get event totals by product
    const eventTotals = await ProductEvent.aggregate([
      {
        $group: {
          _id: { productId: '$productId', type: '$type' },
          total: { $sum: { $ifNull: ['$quantity', 1] } }
        }
      },
      {
        $group: {
          _id: '$_id.productId',
          views: { $sum: { $cond: [{ $eq: ['$_id.type', 'view'] }, '$total', 0] } },
          adds: { $sum: { $cond: [{ $eq: ['$_id.type', 'add_to_cart'] }, '$total', 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$_id.type', 'purchase'] }, '$total', 0] } }
        }
      }
    ])

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        products: products.map(p => ({
          _id: p._id,
          name: p.name,
          views: p.views ?? 0,
          addToCartCount: p.addToCartCount ?? 0,
          purchaseCount: p.purchaseCount ?? 0,
          popularityScore: p.popularityScore ?? 0,
          createdAt: p.createdAt
        })),
        events: events.map(e => ({
          productId: e.productId,
          type: e.type,
          quantity: e.quantity ?? 1,
          userId: e.userId,
          createdAt: e.createdAt
        })),
        eventTotals
      }
    })
  } catch (error) {
    console.error('Debug analytics error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to debug analytics'
    }, { status: 500 })
  }
}
