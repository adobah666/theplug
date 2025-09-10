import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

import connectDB from '@/lib/db/connection'
import { authOptions } from '@/lib/auth/config'
import Review from '@/lib/db/models/Review'
import Order from '@/lib/db/models/Order'
import Product from '@/lib/db/models/Product'
import { ApiResponse } from '@/types'

// GET /api/products/[id]/reviews
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const productId = params.id

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid product id' }, { status: 400 })
    }

    const url = new URL(_req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)

    const reviews = await Review.find({ productId, isVisible: true })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await Review.countDocuments({ productId, isVisible: true })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (err) {
    console.error('GET product reviews failed:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to load reviews' }, { status: 500 })
  }
}

// POST /api/products/[id]/reviews
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid product id' }, { status: 400 })
    }

    const body = await req.json()
    const rating = parseInt(body?.rating, 10)
    const title: string | undefined = body?.title
    const comment: string | undefined = body?.comment

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Rating must be 1-5' }, { status: 400 })
    }

    // Ensure the user has a PAID order containing this product
    const paidOrder = await Order.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      paymentStatus: 'paid',
      'items.productId': new mongoose.Types.ObjectId(productId)
    }).lean()

    if (!paidOrder) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'You can only review products you purchased' }, { status: 403 })
    }

    // Upsert: allow one review per user per product; update if exists
    const review = await Review.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), productId: new mongoose.Types.ObjectId(productId) },
      {
        $set: {
          rating,
          title,
          comment,
          isVerifiedPurchase: true
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    // Recalculate product rating and reviewCount
    const agg = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), isVisible: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])

    const avg = agg.length ? Math.round((agg[0].avg as number) * 10) / 10 : 0
    const count = agg.length ? (agg[0].count as number) : 0

    await Product.findByIdAndUpdate(productId, {
      $set: { rating: avg, reviewCount: count }
    })

    return NextResponse.json<ApiResponse>({ success: true, data: { review } })
  } catch (err: any) {
    const message = err?.message || 'Failed to submit review'
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 400 })
  }
}
