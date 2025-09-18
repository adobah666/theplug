import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connection'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import Product from '@/lib/db/models/Product'
import ProductEvent from '@/lib/db/models/ProductEvent'
import { ApiResponse } from '@/types'

// GET /api/admin/analytics/products/[id]?days=30
// Returns: counters and daily series for views, add_to_cart, purchase
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    const { id } = await context.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid product ID format' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days') || '30')))
    const since = new Date()
    since.setDate(since.getDate() - days + 1)

    const product = (await Product.findById(id).select('_id name views addToCartCount purchaseCount popularityScore').lean()) as any
    if (!product) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Aggregate events by day and type
    const series = await ProductEvent.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(id), createdAt: { $gte: since } } },
      { $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' },
          total: { $sum: '$quantity' }
        }
      },
      { $project: { _id: 0, day: '$_id.day', type: '$_id.type', total: 1 } },
      { $sort: { day: 1 } }
    ])

    // Compute all-time totals from events (used when product counters are zero)
    const totalsAgg = await ProductEvent.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(id) } },
      { $group: {
          _id: '$type',
          total: { $sum: { $ifNull: ['$quantity', 1] } }
        }
      }
    ])
    const totalsMap: Record<string, number> = Object.fromEntries((totalsAgg || []).map((t: any) => [t._id, t.total]))

    // For modal display, use aggregated totals directly so the UI reflects actual history
    const views = (totalsMap['view'] || 0)
    const adds = (totalsMap['add_to_cart'] || 0)
    const purchases = (totalsMap['purchase'] || 0)
    const popularity = ((Number(purchases) * 5) + (Number(adds) * 2) + (Number(views) * 0.2))

    const totals = {
      views,
      addToCartCount: adds,
      purchaseCount: purchases,
      popularityScore: popularity,
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        product: { ...product, ...totals },
        series
      }
    })
  } catch (error) {
    console.error('Admin product analytics GET error:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to load analytics' }, { status: 500 })
  }
}
