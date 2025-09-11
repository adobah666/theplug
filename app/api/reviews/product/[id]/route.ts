import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { getProductReviews, calculateProductRating } from '@/lib/reviews/service'
import mongoose from 'mongoose'

// GET /api/reviews/product/[id] - Get reviews for a specific product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    await connectDB()

    const { id: productId } = await params

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') as any || 'newest'
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined
    const verified = searchParams.get('verified') === 'true'

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const productObjectId = new mongoose.Types.ObjectId(productId)

    // Get reviews and summary in parallel
    const [reviewsData, summary] = await Promise.all([
      getProductReviews(productObjectId, {
        page,
        limit,
        sortBy,
        rating,
        verified
      }),
      calculateProductRating(productObjectId)
    ])

    // Format response
    const response = {
      reviews: reviewsData.reviews,
      pagination: reviewsData.pagination,
      summary
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching product reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}