import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Category from '@/lib/db/models/Category'
import { ApiResponse } from '@/types'
import { authenticateToken } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import { initializeClient } from '@/lib/meilisearch/client'
import { initializeProductsIndex, indexProduct, removeProductFromIndex } from '@/lib/meilisearch/indexing'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

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
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectDB()

      const { id } = 'then' in (context.params as any)
        ? await (context.params as Promise<{ id: string }>)
        : (context.params as { id: string })

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid product ID format'
        }, { status: 400 })
      }

      // Find product by ID with shorter timeout and better error handling
      const product = await Promise.race([
        Product.findById(id)
          .populate('category', 'name')
          .lean()
          .maxTimeMS(3000), // 3 second timeout instead of 10
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 3000)
        )
      ]) as any;

      if (!product) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Product not found'
        }, { status: 404 })
      }

      const response = NextResponse.json<ApiResponse>({
        success: true,
        data: { product }
      })
      
      // Add caching headers for better performance
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      response.headers.set('CDN-Cache-Control', 'public, max-age=60')
      
      return response

    } catch (error) {
      lastError = error as Error;
      console.error(`Get product error (attempt ${attempt}/${maxRetries}):`, error)
      
      // Don't retry on validation errors or 404s
      if (error instanceof Error && 
          (error.message.includes('Invalid product ID') || 
           error.message.includes('Product not found'))) {
        break;
      }
      
      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }

  return NextResponse.json<ApiResponse>({
    success: false,
    error: lastError?.message || 'Failed to fetch product'
  }, { status: 500 })
}

// PUT /api/products/[id] - Update product (admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()

    // Verify authentication and admin role (NextAuth session first, then JWT)
    const session = await getServerSession(authOptions)
    let isAdmin = false
    if (session && (session.user as any)?.role === 'admin') {
      isAdmin = true
    } else {
      const authResult = await authenticateToken(request)
      if (!(authResult.success && authResult.user)) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Authentication required' }, { status: 401 })
      }
      isAdmin = authResult.user.role === 'admin'
    }
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    const { id } = 'then' in (context.params as any)
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string })

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
    // Normalize and validate variants + inventory rule
    if (body.variants !== undefined) {
      const normalized = body.variants.map(v => ({
        _id: v._id,
        size: v.size?.trim() || undefined,
        color: v.color?.trim() || undefined,
        sku: v.sku?.trim?.() || v.sku,
        price: v.price,
        inventory: Number(v.inventory) || 0,
      }))
      updateData.variants = normalized
      if (normalized.length > 0) {
        const total = normalized.reduce((s, x) => s + (Number(x.inventory) || 0), 0)
        const inv = body.inventory != null ? Number(body.inventory) : undefined
        if (inv != null) {
          if (Number.isNaN(inv) || inv < 0) {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Inventory must be a non-negative number' }, { status: 400 })
          }
          if (inv !== total) {
            return NextResponse.json<ApiResponse>({ success: false, error: `Inventory (${inv}) must equal the sum of variant inventories (${total})` }, { status: 400 })
          }
          updateData.inventory = inv
        } else {
          // If inventory not provided, set to sum to keep consistency
          updateData.inventory = total
        }
      }
    }
    if (body.inventory !== undefined && updateData.variants === undefined) {
      // If variants not being updated in this request, still allow inventory change (no coupling possible here)
      updateData.inventory = body.inventory
    }

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

    // Best-effort: re-index in Meilisearch
    try {
      await initializeClient()
      await initializeProductsIndex()
      await indexProduct(updatedProduct as any)
    } catch (e) {
      console.warn('Meilisearch indexing (update) failed or is unavailable:', e instanceof Error ? e.message : e)
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
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()

    // Verify authentication and admin role (NextAuth session first, then JWT)
    const session = await getServerSession(authOptions)
    let isAdmin = false
    if (session && (session.user as any)?.role === 'admin') {
      isAdmin = true
    } else {
      const authResult = await authenticateToken(request)
      if (!(authResult.success && authResult.user)) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Authentication required' }, { status: 401 })
      }
      isAdmin = authResult.user.role === 'admin'
    }
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Admin privileges required' }, { status: 403 })
    }

    const { id } = 'then' in (context.params as any)
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string })

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

    // Best-effort: remove from Meilisearch
    try {
      await initializeClient()
      await removeProductFromIndex(String(id))
    } catch (e) {
      console.warn('Meilisearch remove (delete) failed or is unavailable:', e instanceof Error ? e.message : e)
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