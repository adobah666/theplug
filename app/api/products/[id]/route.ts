import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import { ApiResponse } from '@/types'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

interface ProductUpdateRequest {
  name?: string
  description?: string
  price?: number
  images?: string[]
  category?: string
  brand?: string
  variants?: Array<{
    _id?: string
    size?: string
    color?: string
    sku: string
    price?: number
    inventory: number
  }>
  inventory?: number
}

// GET /api/products/[id] - Get individual product details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const { id } = params

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 })
    }

    // Find product by ID
    const product = await Product.findById(id)
      .populate('category', 'name')
      .lean()

    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { product }
    })

  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch product'
    }, { status: 500 })
  }
}

// PUT /api/products/[id] - Update product (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 })
    }

    const body: ProductUpdateRequest = await request.json()

    // Validate category ObjectId format if provided
    if (body.category && !mongoose.Types.ObjectId.isValid(body.category)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid category ID format'
      }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description.trim()
    if (body.price !== undefined) updateData.price = body.price
    if (body.images !== undefined) updateData.images = body.images
    if (body.category !== undefined) updateData.category = new mongoose.Types.ObjectId(body.category)
    if (body.brand !== undefined) updateData.brand = body.brand.trim()
    if (body.variants !== undefined) updateData.variants = body.variants
    if (body.inventory !== undefined) updateData.inventory = body.inventory

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('category', 'name')

    if (!updatedProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    })

  } catch (error) {
    console.error('Update product error:', error)
    
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
      error: 'Failed to update product'
    }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Delete product (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 })
    }

    // Delete product
    const deletedProduct = await Product.findByIdAndDelete(id)

    if (!deletedProduct) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Product deleted successfully',
      data: { product: deletedProduct }
    })

  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to delete product'
    }, { status: 500 })
  }
}