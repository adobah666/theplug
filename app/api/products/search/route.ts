import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import { ApiResponse, PaginatedResponse } from '@/types'
import mongoose from 'mongoose'

interface SearchFilters {
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
  minRating?: number
}

interface SearchParams extends SearchFilters {
  q?: string // search query
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

// GET /api/products/search - Search and filter products
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    
    // Extract search parameters
    const params: SearchParams = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      brand: searchParams.get('brand') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      size: searchParams.get('size') || undefined,
      color: searchParams.get('color') || undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
      sort: searchParams.get('sort') || 'relevance',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc'
    }

    // Validate pagination parameters
    if (params.page! < 1 || params.limit! < 1 || params.limit! > 100) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
      }, { status: 400 })
    }

    // Validate price range
    if (params.minPrice !== undefined && params.minPrice < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Minimum price cannot be negative'
      }, { status: 400 })
    }

    if (params.maxPrice !== undefined && params.maxPrice < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Maximum price cannot be negative'
      }, { status: 400 })
    }

    if (params.minPrice !== undefined && params.maxPrice !== undefined && params.minPrice > params.maxPrice) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Minimum price cannot be greater than maximum price'
      }, { status: 400 })
    }

    // Validate rating
    if (params.minRating !== undefined && (params.minRating < 0 || params.minRating > 5)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Rating must be between 0 and 5'
      }, { status: 400 })
    }

    // Build MongoDB query
    const query: any = {}

    // Text search
    if (params.q) {
      query.$text = { $search: params.q }
    }

    // Category filter
    if (params.category) {
      // Handle both category ID and category slug
      if (mongoose.Types.ObjectId.isValid(params.category)) {
        query.category = new mongoose.Types.ObjectId(params.category)
      } else {
        // Find category by slug
        const category = await Category.findOne({ slug: params.category.toLowerCase() })
        if (category) {
          query.category = category._id
        } else {
          // If category not found, return empty results
          return NextResponse.json<ApiResponse>({
            success: true,
            data: {
              data: [],
              pagination: {
                page: params.page!,
                limit: params.limit!,
                total: 0,
                pages: 0,
                hasNext: false,
                hasPrev: false
              }
            }
          })
        }
      }
    }

    // Brand filter
    if (params.brand) {
      query.brand = { $regex: new RegExp(params.brand, 'i') }
    }

    // Price range filter
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      query.price = {}
      if (params.minPrice !== undefined) {
        query.price.$gte = params.minPrice
      }
      if (params.maxPrice !== undefined) {
        query.price.$lte = params.maxPrice
      }
    }

    // Rating filter
    if (params.minRating !== undefined) {
      query.rating = { $gte: params.minRating }
    }

    // Size and color filters (check variants)
    if (params.size || params.color) {
      const variantQuery: any = {}
      
      if (params.size) {
        variantQuery['variants.size'] = { $regex: new RegExp(params.size, 'i') }
      }
      
      if (params.color) {
        variantQuery['variants.color'] = { $regex: new RegExp(params.color, 'i') }
      }
      
      // Combine with existing query
      if (Object.keys(variantQuery).length > 0) {
        query.$and = query.$and || []
        query.$and.push(variantQuery)
      }
    }

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {}
    const order = params.order === 'asc' ? 1 : -1

    switch (params.sort) {
      case 'price':
        sortObj.price = order
        break
      case 'rating':
        sortObj.rating = order
        break
      case 'date':
      case 'createdAt':
        sortObj.createdAt = order
        break
      case 'name':
        sortObj.name = order
        break
      case 'popularity':
        // Sort by review count as a proxy for popularity
        sortObj.reviewCount = order
        break
      case 'relevance':
      default:
        if (params.q) {
          // If there's a text search, sort by text score
          sortObj.score = { $meta: 'textScore' } as any
        } else {
          // Default to newest first
          sortObj.createdAt = -1
        }
        break
    }

    const skip = (params.page! - 1) * params.limit!

    // Execute query with aggregation for better performance
    const aggregationPipeline: any[] = [
      { $match: query }
    ]

    // Add text score for relevance sorting
    if (params.q && params.sort === 'relevance') {
      aggregationPipeline.push({
        $addFields: { score: { $meta: 'textScore' } }
      })
    }

    // Add lookup for category
    aggregationPipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    })

    // Unwind category array
    aggregationPipeline.push({
      $unwind: '$category'
    })

    // Add sort stage
    aggregationPipeline.push({ $sort: sortObj })

    // Add facet stage for pagination and total count
    aggregationPipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: params.limit! }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    })

    const [result] = await Product.aggregate(aggregationPipeline)
    
    const products = result.data || []
    const total = result.totalCount[0]?.count || 0
    const pages = Math.ceil(total / params.limit!)

    const response: PaginatedResponse<typeof products[0]> = {
      data: products,
      pagination: {
        page: params.page!,
        limit: params.limit!,
        total,
        pages,
        hasNext: params.page! < pages,
        hasPrev: params.page! > 1
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Product search error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to search products'
    }, { status: 500 })
  }
}