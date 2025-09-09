import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import { ApiResponse } from '@/types'

// POST /api/admin/analytics/recalc
// Recalculate popularityScore from counters for all products
export async function POST(_request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    // popularityScore = purchaseCount*5 + addToCartCount*2 + views*0.2
    const products = await Product.find({}, { _id: 1, views: 1, addToCartCount: 1, purchaseCount: 1 })
    const ops = products.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            popularityScore: (Number(p.purchaseCount || 0) * 5)
              + (Number(p.addToCartCount || 0) * 2)
              + (Number(p.views || 0) * 0.2)
          }
        }
      }
    }))

    if (ops.length > 0) await Product.bulkWrite(ops)

    return NextResponse.json<ApiResponse>({ success: true, message: 'Popularity scores recalculated' })
  } catch (error) {
    console.error('Recalc popularity error:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to recalculate popularity' }, { status: 500 })
  }
}
