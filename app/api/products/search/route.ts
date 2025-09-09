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
    const rawMin = (searchParams.get('minPrice') || '').trim()
    const rawMax = (searchParams.get('maxPrice') || '').trim()
    const parsedMin = rawMin !== '' ? Number(rawMin) : undefined
    const parsedMax = rawMax !== '' ? Number(rawMax) : undefined

    const params: SearchParams = {
      q: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      brand: searchParams.get('brand') || undefined,
      minPrice: (parsedMin !== undefined && !Number.isNaN(parsedMin)) ? parsedMin : undefined,
      maxPrice: (parsedMax !== undefined && !Number.isNaN(parsedMax)) ? parsedMax : undefined,
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

    if (
      params.minPrice !== undefined && !Number.isNaN(params.minPrice) &&
      params.maxPrice !== undefined && !Number.isNaN(params.maxPrice) &&
      params.minPrice > params.maxPrice
    ) {
      // Be forgiving: swap instead of erroring
      const tmp = params.minPrice
      params.minPrice = params.maxPrice
      params.maxPrice = tmp
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

    // Defer text filtering until after category lookup so we can also match category.name
    const textQuery = params.q ? params.q : undefined

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

    // Brand filter (support multiple comma-separated values)
    if (params.brand) {
      const brands = params.brand.split(',').map(b => b.trim()).filter(Boolean)
      if (brands.length === 1) {
        query.brand = { $regex: new RegExp(brands[0], 'i') }
      } else if (brands.length > 1) {
        query.$or = query.$or || []
        query.$or.push({ brand: { $in: brands.map(b => new RegExp(b, 'i')) } })
      }
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

    // Size and color filters (support multiple values, check variants)
    if (params.size || params.color) {
      const andClauses: any[] = []

      if (params.size) {
        const sizes = params.size.split(',').map(s => s.trim()).filter(Boolean)
        if (sizes.length === 1) {
          andClauses.push({ 'variants.size': { $regex: new RegExp(sizes[0], 'i') } })
        } else if (sizes.length > 1) {
          andClauses.push({ 'variants.size': { $in: sizes.map(s => new RegExp(s, 'i')) } })
        }
      }

      if (params.color) {
        const colors = params.color.split(',').map(c => c.trim()).filter(Boolean)
        if (colors.length === 1) {
          andClauses.push({ 'variants.color': { $regex: new RegExp(colors[0], 'i') } })
        } else if (colors.length > 1) {
          andClauses.push({ 'variants.color': { $in: colors.map(c => new RegExp(c, 'i')) } })
        }
      }

      if (andClauses.length > 0) {
        query.$and = query.$and || []
        query.$and.push(...andClauses)
      }
    }

    // Build sort object
    const sortObj: Record<string, any> = {}
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
        // Sort by computed popularity (from events or counters). We'll add popularityComputed later in pipeline
        sortObj.popularityComputed = order
        sortObj.purchaseCount = order
        break
      case 'relevance':
      default:
        // With regex search, compute a relevance score and sort by it when q is present
        if (!params.q) {
          sortObj.createdAt = -1
        } else {
          // We'll add a $addFields stage to compute `relevance`, then sort by it desc
          sortObj.relevance = -1
          sortObj.createdAt = -1
        }
        break
    }

    const skip = (params.page! - 1) * params.limit!

    // Execute query with aggregation for better performance
    const aggregationPipeline: any[] = [
      { $match: query }
    ]

    // When searching, compute a relevance score for better ranking
    if (params.q) {
      const escaped = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const startsWithPattern = `^${escaped}`
      const containsPattern = `${escaped}`

      aggregationPipeline.push({
        $addFields: {
          relevance: {
            $add: [
              // High weight for name/brand startsWith
              { $cond: [{ $regexMatch: { input: "$name", regex: startsWithPattern, options: "i" } }, 100, 0] },
              { $cond: [{ $regexMatch: { input: "$brand", regex: startsWithPattern, options: "i" } }, 80, 0] },

              // Medium weight for name/brand contains
              { $cond: [{ $regexMatch: { input: "$name", regex: containsPattern, options: "i" } }, 60, 0] },
              { $cond: [{ $regexMatch: { input: "$brand", regex: containsPattern, options: "i" } }, 50, 0] },

              // Variants fields contains (any element true)
              {
                $cond: [
                  {
                    $anyElementTrue: {
                      $map: {
                        input: { $ifNull: ["$variants", []] },
                        as: "v",
                        in: {
                          $or: [
                            { $regexMatch: { input: "$$v.sku", regex: containsPattern, options: "i" } },
                            { $regexMatch: { input: "$$v.color", regex: containsPattern, options: "i" } },
                            { $regexMatch: { input: "$$v.size", regex: containsPattern, options: "i" } }
                          ]
                        }
                      }
                    }
                  },
                  40,
                  0
                ]
              },

              // Low weight for description contains
              { $cond: [{ $regexMatch: { input: "$description", regex: containsPattern, options: "i" } }, 20, 0] },

              // Position boost: earlier match in name gets more points (100 - index)
              {
                $let: {
                  vars: { pos: { $indexOfCP: [ { $toLower: "$name" }, { $toLower: containsPattern } ] } },
                  in: {
                    $cond: [
                      { $and: [ { $ne: ["$$pos", -1] }, { $gte: [100, "$$pos"] } ] },
                      { $subtract: [100, "$$pos"] },
                      0
                    ]
                  }
                }
              }
            ]
          }
        }
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

    // Overlay ProductEvent totals per product and compute effective counters & popularity
    aggregationPipeline.push({
      $lookup: {
        from: 'productevents',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$productId', '$$pid'] } } },
          { $group: { _id: { type: '$type' }, total: { $sum: { $ifNull: ['$quantity', 1] } } } },
          { $group: {
              _id: null,
              views: { $sum: { $cond: [{ $eq: ['$_id.type', 'view'] }, '$total', 0] } },
              adds: { $sum: { $cond: [{ $eq: ['$_id.type', 'add_to_cart'] }, '$total', 0] } },
              purchases: { $sum: { $cond: [{ $eq: ['$_id.type', 'purchase'] }, '$total', 0] } }
            }
          },
          { $project: { _id: 0, views: 1, adds: 1, purchases: 1 } }
        ],
        as: 'eventAgg'
      }
    })
    aggregationPipeline.push({
      $addFields: {
        _eventTotals: { $ifNull: [ { $arrayElemAt: ['$eventAgg', 0] }, { views: 0, adds: 0, purchases: 0 } ] }
      }
    })
    aggregationPipeline.push({
      $addFields: {
        views: { $cond: [{ $gt: ['$views', 0] }, '$views', '$_eventTotals.views'] },
        addToCartCount: { $cond: [{ $gt: ['$addToCartCount', 0] }, '$addToCartCount', '$_eventTotals.adds'] },
        purchaseCount: { $cond: [{ $gt: ['$purchaseCount', 0] }, '$purchaseCount', '$_eventTotals.purchases'] },
      }
    })
    aggregationPipeline.push({
      $addFields: {
        popularityComputed: {
          $add: [
            { $multiply: [{ $ifNull: ['$purchaseCount', 0] }, 5] },
            { $multiply: [{ $ifNull: ['$addToCartCount', 0] }, 2] },
            { $multiply: [{ $ifNull: ['$views', 0] }, 0.2] }
          ]
        },
        // We also mirror the popularity into popularityScore for consumers that read that field
        popularityScore: { $ifNull: ['$popularityScore', '$popularityComputed'] }
      }
    })

    // When searching, optionally apply a text filter that also includes category.name
    if (textQuery) {
      const escaped = textQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(escaped, 'i')
      aggregationPipeline.push({
        $match: {
          $or: [
            { name: rx },
            { brand: rx },
            { description: rx },
            { searchableText: rx },
            { 'variants.sku': rx },
            { 'variants.color': rx },
            { 'variants.size': rx },
            { 'category.name': rx },
            { 'category.slug': rx }
          ]
        }
      })
    }

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