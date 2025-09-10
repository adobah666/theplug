import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'

export async function GET(request: NextRequest) {
  try {
    console.log('[API:trending] Starting trending products fetch')
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || []
    
    console.log('[API:trending] Params - limit:', limit, 'excludeIds:', excludeIds)

    await connectDB()

    // Build the query to exclude specific product IDs
    const query: any = {}
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds }
    }

    console.log('[API:trending] MongoDB query:', JSON.stringify(query))

    // Fetch trending products sorted by popularity score
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ 
        popularityScore: -1,  // Primary sort by popularity
        purchaseCount: -1,    // Secondary sort by purchases
        addToCartCount: -1,   // Tertiary sort by cart adds
        viewCount: -1         // Final sort by views
      })
      .limit(limit)
      .lean()

    console.log('[API:trending] Found products count:', products.length)

    // Transform products for frontend
    const transformedProducts = products.map((product: any) => {
      const imageUrl = product.images && product.images.length > 0 
        ? product.images[0] 
        : '/images/placeholder.png'

      console.log('[API:trending] Product:', product.name, 'popularity:', product.popularityScore || 0)

      return {
        id: product._id.toString(),
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: imageUrl,
        category: product.category?.name || 'Uncategorized',
        categorySlug: product.category?.slug || 'uncategorized',
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        isNew: product.isNew || false,
        isOnSale: product.originalPrice && product.originalPrice > product.price,
        popularityScore: product.popularityScore || 0,
        purchaseCount: product.purchaseCount || 0,
        addToCartCount: product.addToCartCount || 0,
        viewCount: product.viewCount || 0
      }
    })

    console.log('[API:trending] Returning', transformedProducts.length, 'trending products')
    console.log('[API:trending] Top 3 products by popularity:', 
      transformedProducts.slice(0, 3).map(p => ({ name: p.name, popularity: p.popularityScore })))

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      meta: {
        total: transformedProducts.length,
        limit,
        excludedCount: excludeIds.length
      }
    })

  } catch (error) {
    console.error('[API:trending] Error fetching trending products:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trending products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
