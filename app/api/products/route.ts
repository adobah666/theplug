import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import { ApiResponse, PaginatedResponse } from '@/types'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

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
    const validSortFields = ['name', 'price', 'rating', 'createdAt', 'updatedAt']
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

    const pages = Math.ceil(total / limit)

    const response: PaginatedResponse<typeof products[0]> = {
      data: products,
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

    // Verify authentication and admin role
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // For now, we'll skip admin role check since we don't have roles implemented yet
    // TODO: Add admin role verification when user roles are implemented

    const body: ProductCreateRequest = await request.json()
    const { name, description, price, images, category, brand, variants, inventory } = body

    // Validate required fields
    if (!name || !description || !price || !images || !category || !brand) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Name, description, price, images, category, and brand are required'
      }, { status: 400 })
    }

    // Validate category ObjectId format
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid category ID format'
      }, { status: 400 })
    }

    // Create new product
    const newProduct = new Product({
      name: name.trim(),
      description: description.trim(),
      price,
      images,
      category: new mongoose.Types.ObjectId(category),
      brand: brand.trim(),
      variants: variants || [],
      inventory: inventory || 0
    })

    await newProduct.save()

    // Populate category for response
    await newProduct.populate('category', 'name')

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