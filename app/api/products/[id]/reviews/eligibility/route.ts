import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

import connectDB from '@/lib/db/connection'
import { authOptions } from '@/lib/auth/config'
import Review from '@/lib/db/models/Review'
import Order from '@/lib/db/models/Order'
import { ApiResponse } from '@/types'

// GET /api/products/[id]/reviews/eligibility
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    const productId = params.id

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid product id' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json<ApiResponse>({ success: true, data: { canReview: false, reason: 'not_authenticated' } })
    }

    // Check if user has any PAID order with this product
    const hasPaidOrder = await Order.exists({
      userId: new mongoose.Types.ObjectId(userId),
      paymentStatus: 'paid',
      'items.productId': new mongoose.Types.ObjectId(productId)
    })

    if (!hasPaidOrder) {
      return NextResponse.json<ApiResponse>({ success: true, data: { canReview: false, reason: 'no_paid_order' } })
    }

    // Check if user already left a review
    const myReview = await Review.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      productId: new mongoose.Types.ObjectId(productId)
    }).lean()

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        canReview: true,
        myReview: myReview || null
      }
    })
  } catch (err) {
    console.error('Eligibility check failed:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to check eligibility' }, { status: 500 })
  }
}
