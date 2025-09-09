import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import mongoose from 'mongoose'
import Product from '@/lib/db/models/Product'
import ProductEvent from '@/lib/db/models/ProductEvent'
import { ApiResponse } from '@/types'

// POST /api/admin/analytics/backfill
// Recomputes product counters (views, addToCartCount, purchaseCount) from ProductEvent and updates popularityScore
export async function POST(_request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    // Aggregate totals per productId and type
    const totals = await ProductEvent.aggregate([
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

    if (!totals || totals.length === 0) {
      return NextResponse.json<ApiResponse>({ success: true, message: 'No events to backfill' })
    }

    // Build bulk updates for Product
    const ops = totals.map((t: any) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(t._id) },
        update: {
          $set: {
            views: t.views || 0,
            addToCartCount: t.adds || 0,
            purchaseCount: t.purchases || 0,
            popularityScore: (Number(t.purchases || 0) * 5) + (Number(t.adds || 0) * 2) + (Number(t.views || 0) * 0.2)
          }
        },
        upsert: false
      }
    }))

    if (ops.length > 0) await Product.bulkWrite(ops, { ordered: false })

    // Prepare a light response payload for verification in admin UI
    const preview = totals.slice(0, 20).map((t: any) => ({
      productId: t._id,
      views: t.views || 0,
      adds: t.adds || 0,
      purchases: t.purchases || 0,
      popularity: (Number(t.purchases || 0) * 5) + (Number(t.adds || 0) * 2) + (Number(t.views || 0) * 0.2)
    }))

    return NextResponse.json<ApiResponse>({ success: true, message: 'Backfill completed', data: { updated: ops.length, previewCount: preview.length, preview } })
  } catch (error) {
    console.error('Analytics backfill error:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to backfill analytics' }, { status: 500 })
  }
}
