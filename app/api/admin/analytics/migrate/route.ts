import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import { ApiResponse } from '@/types'

// POST /api/admin/analytics/migrate
// Ensures all existing products have analytics fields with default values
export async function POST(_request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    // Update all products to ensure they have analytics fields.
    // IMPORTANT: Use an aggregation update pipeline so expressions like $ifNull are evaluated.
    const result = await Product.updateMany(
      {},
      [
        {
          $set: {
            views: { $ifNull: [ '$views', 0 ] },
            addToCartCount: { $ifNull: [ '$addToCartCount', 0 ] },
            purchaseCount: { $ifNull: [ '$purchaseCount', 0 ] },
            popularityScore: { $ifNull: [ '$popularityScore', 0 ] },
          }
        }
      ] as any
    )

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Analytics fields migration completed',
      data: { modified: result.modifiedCount, matched: result.matchedCount }
    })
  } catch (error) {
    console.error('Analytics migration error:', error)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to migrate analytics fields' }, { status: 500 })
  }
}
