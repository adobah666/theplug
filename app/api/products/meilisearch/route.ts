import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, getSearchSuggestions, type ProductSearchParams } from '../../../../lib/meilisearch/search'
import { initializeClient } from '../../../../lib/meilisearch/client'

// GET /api/products/meilisearch - Search products using Meilisearch
export async function GET(request: NextRequest) {
  try {
    // Ensure Meilisearch client is initialized (uses real server if available, otherwise mock)
    await initializeClient()
    
    const { searchParams } = new URL(request.url)
    
    // Parse search parameters
    const params: ProductSearchParams = {
      query: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      brand: (() => {
        const b = searchParams.get('brand')
        if (!b) return undefined
        const items = b.split(',').map(s => s.trim()).filter(Boolean)
        return items.length > 1 ? items : items[0]
      })(),
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      size: searchParams.get('size') || undefined,
      color: searchParams.get('color') || undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      inStock: searchParams.get('inStock') === 'true',
      sortBy: (searchParams.get('sortBy') as any) || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    }

    // Backward-compat: map `sort` + optional `order` to Meilisearch `sortBy`
    if (!params.sortBy) {
      const sort = searchParams.get('sort') || undefined
      const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'
      if (sort) {
        switch (sort) {
          case 'price':
            params.sortBy = order === 'asc' ? 'price_asc' : 'price_desc'
            break
          case 'createdAt':
          case 'date':
          case 'newest':
            params.sortBy = order === 'asc' ? 'oldest' : 'newest'
            break
          case 'rating':
            params.sortBy = 'rating_desc'
            break
          case 'popularity':
            params.sortBy = 'popularity'
            break
          case 'relevance':
          default:
            // Let Meilisearch relevance take precedence
            break
        }
      }
    }
    
    // Validate pagination parameters
    if (params.page !== undefined && params.page < 1) {
      return NextResponse.json(
        { error: 'Page number must be greater than 0' },
        { status: 400 }
      )
    }
    
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }
    
    // Validate price range
    if (params.minPrice && params.minPrice < 0) {
      return NextResponse.json(
        { error: 'Minimum price cannot be negative' },
        { status: 400 }
      )
    }
    
    if (params.maxPrice && params.maxPrice < 0) {
      return NextResponse.json(
        { error: 'Maximum price cannot be negative' },
        { status: 400 }
      )
    }
    
    if (params.minPrice && params.maxPrice && params.minPrice > params.maxPrice) {
      return NextResponse.json(
        { error: 'Minimum price cannot be greater than maximum price' },
        { status: 400 }
      )
    }
    
    // Validate rating
    if (params.minRating && (params.minRating < 0 || params.minRating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 0 and 5' },
        { status: 400 }
      )
    }
    
    // Perform search
    const results = await searchProducts(params)
    
    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        currentPage: results.currentPage,
        totalPages: results.totalPages,
        totalHits: results.totalHits,
        limit: params.limit || 20
      }
    })
    
  } catch (error) {
    console.error('Meilisearch API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search products',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/products/meilisearch/suggestions - Get search suggestions
export async function POST(request: NextRequest) {
  try {
    // Ensure Meilisearch client is initialized (uses real server if available, otherwise mock)
    await initializeClient()
    
    const body = await request.json()
    const { query, limit = 5 } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      )
    }
    
    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }
    
    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 20' },
        { status: 400 }
      )
    }
    
    const suggestions = await getSearchSuggestions(query, limit)
    
    return NextResponse.json({
      success: true,
      data: {
        query,
        suggestions
      }
    })
    
  } catch (error) {
    console.error('Search suggestions API error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to get search suggestions',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}