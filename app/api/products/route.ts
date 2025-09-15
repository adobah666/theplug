import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import ProductEvent from '@/lib/db/models/ProductEvent'
import { ApiResponse, PaginatedResponse } from '@/types'
import { authenticateToken } from '@/lib/auth/middleware'
import { authOptions } from '@/lib/auth/config'
import mongoose from 'mongoose'
import { initializeClient } from '@/lib/meilisearch/client'
import { initializeProductsIndex, indexProduct } from '@/lib/meilisearch/indexing'

interface ProductCreateRequest {
  name: string
  description: string
  price: number
  images: string[]
  category: string
  brand: string
  variants?: Array<{
    size?: string
    color?: string
    sku: string
    price?: number
    inventory: number
  }>
  inventory: number
}

// GET /api/products - List products with pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') === 'asc' ? 1 : -1

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
      }, { status: 400 })
    }

    const skip = (page - 1) * limit

    // Build sort object
    const sortObj: Record<string, 1 | -1> = {}
    const validSortFields = ['name', 'price', 'rating', 'createdAt', 'updatedAt', 'popularityScore', 'purchaseCount']
    if (validSortFields.includes(sort)) {
      sortObj[sort] = order
    } else {
      sortObj['createdAt'] = -1 // Default sort
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      Product.find({})
        .populate('category', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments({})
    ])

    // Overlay aggregated event totals so UI shows real counts even when product counters are zero
    const ids = products.map(p => (p as any)._id).filter(Boolean)
    let totalsById: Record<string, { views: number; adds: number; purchases: number }> = {}
    if (ids.length > 0) {
      const totals = await ProductEvent.aggregate([
        { $match: { productId: { $in: ids as any } } },
        { $group: { _id: { productId: '$productId', type: '$type' }, total: { $sum: { $ifNull: ['$quantity', 1] } } } },
        { $group: {
            _id: '$_id.productId',
            views: { $sum: { $cond: [{ $eq: ['$_id.type', 'view'] }, '$total', 0] } },
            adds: { $sum: { $cond: [{ $eq: ['$_id.type', 'add_to_cart'] }, '$total', 0] } },
            purchases: { $sum: { $cond: [{ $eq: ['$_id.type', 'purchase'] }, '$total', 0] } }
          }
        }
      ])
      totalsById = Object.fromEntries(totals.map((t: any) => [String(t._id), { views: t.views || 0, adds: t.adds || 0, purchases: t.purchases || 0 }]))
    }

    const merged = products.map((p: any) => {
      const t = totalsById[String(p._id)]
      if (t) {
        const views = p.views > 0 ? p.views : t.views
        const adds = p.addToCartCount > 0 ? p.addToCartCount : t.adds
        const purchases = p.purchaseCount > 0 ? p.purchaseCount : t.purchases
        const popularity = (Number(purchases) * 5) + (Number(adds) * 2) + (Number(views) * 0.2)
        return { ...p, views, addToCartCount: adds, purchaseCount: purchases, popularityScore: popularity }
      }
      return p
    })

    const pages = Math.ceil(total / limit)

    const response: PaginatedResponse<typeof products[0]> = {
      data: merged,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch products'
    }, { status: 500 })
  }
}

// POST /api/products - Create new product (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication and admin role via NextAuth session first
    const session = await getServerSession(authOptions)
    if (!(session && (session.user as any)?.role === 'admin')) {
      // Fall back to JWT Authorization header auth
      const authResult = await authenticateToken(request)
      if (!authResult.success || !authResult.user) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Authentication required'
        }, { status: 401 })
      }
      if (authResult.user.role !== 'admin') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Admin privileges required'
        }, { status: 403 })
      }
    }

    const body: ProductCreateRequest = await request.json()
    const { name, description, price, images, category, brand } = body
    let { variants, inventory } = body

    // Validate required fields (description is optional)
    if (!name || !price || !images || !category || !brand) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Name, price, images, category, and brand are required'
      }, { status: 400 })
    }

    // Validate category ObjectId format
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid category ID format'
      }, { status: 400 })
    }

    // Normalize variants
    variants = (variants || []).map(v => ({
      size: v.size?.trim() || undefined,
      color: v.color?.trim() || undefined,
      sku: v.sku.trim(),
      price: v.price,
      inventory: Number(v.inventory) || 0,
    }))

    // If variants exist, validate inventory equals sum of variant inventories
    if (variants && variants.length > 0) {
      const variantsTotal = variants.reduce((sum, v) => sum + (Number(v.inventory) || 0), 0)
      if (inventory == null) inventory = 0
      const inventoryNum = Number(inventory)
      if (Number.isNaN(inventoryNum) || inventoryNum < 0) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Inventory must be a non-negative number' }, { status: 400 })
      }
      if (inventoryNum !== variantsTotal) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Inventory (${inventoryNum}) must equal the sum of variant inventories (${variantsTotal})`
        }, { status: 400 })
      }
      // Ensure inventory matches sum
      inventory = variantsTotal
    }

    // Create new product
    const newProduct = new Product({
      name: name.trim(),
      ...(typeof description === 'string' && description.trim().length > 0 ? { description: description.trim() } : {}),
      price,
      images,
      category: new mongoose.Types.ObjectId(category),
      brand: brand.trim(),
      variants: variants || [],
      inventory: Number(inventory) || 0
    })

    await newProduct.save()

    // Populate category for response
    await newProduct.populate('category', 'name')

    // Best-effort: index in Meilisearch so search picks it up without manual scripts
    try {
      await initializeClient()
      await initializeProductsIndex()
      await indexProduct(newProduct as any)
    } catch (e) {
      console.warn('Meilisearch indexing (create) failed or is unavailable:', e instanceof Error ? e.message : e)
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Product created successfully',
      data: { product: newProduct }
    }, { status: 201 })

  } catch (error) {
    console.error('Create product error:', error)
    
    // Handle mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Validation failed',
        data: { errors: error.message }
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to create product'
    }, { status: 500 })
  }
}