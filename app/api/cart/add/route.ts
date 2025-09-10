import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import Product from '@/lib/db/models/Product'
import { verifyToken } from '@/lib/auth/jwt'
import { ApiResponse } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

interface AddToCartRequest {
  productId: string
  variantId?: string
  quantity: number
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body: AddToCartRequest = await request.json()
    const { productId, variantId, quantity } = body

    // Validate required fields
    if (!productId || !quantity) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product ID and quantity are required'
      }, { status: 400 })
    }

    // Validate quantity
    if (quantity < 1 || quantity > 99) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Quantity must be between 1 and 99'
      }, { status: 400 })
    }

    // Get user ID from NextAuth session or Authorization token; otherwise use session ID for guest users
    let userId: string | null = null
    let sessionId: string | null = null

    const session = await getServerSession(authOptions)
    if (session && (session.user as any)?.id) {
      userId = (session.user as any).id
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const decoded = verifyToken(token)
          userId = decoded.userId
        } catch (error) {
          // Invalid token, treat as guest user
        }
      }
    }

    // For guest users, use session ID from cookies or generate one
    if (!userId) {
      sessionId = request.cookies.get('sessionId')?.value
      if (!sessionId) {
        sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }

    // Find the product and validate it exists
    const product = await Product.findById(productId).populate('category')
    if (!product) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product not found'
      }, { status: 404 })
    }

    // Validate variant if provided and check inventory
    let selectedVariant = null
    let price = product.price
    let size: string | undefined
    let color: string | undefined
    let availableInventory = product.inventory

    if (variantId && product.variants.length > 0) {
      selectedVariant = product.variants.find(v => v._id?.toString() === variantId)
      if (!selectedVariant) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Product variant not found'
        }, { status: 404 })
      }
      
      // Use variant price if available, otherwise use product price
      price = selectedVariant.price || product.price
      size = selectedVariant.size
      color = selectedVariant.color
      availableInventory = selectedVariant.inventory
    }

    // Check inventory availability
    if (availableInventory < quantity) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Only ${availableInventory} items available in stock`
      }, { status: 400 })
    }

    // Check if product is out of stock
    if (availableInventory === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Product is out of stock'
      }, { status: 400 })
    }

    // Find or create cart
    const cartQuery = userId ? { userId } : { sessionId }
    let cart = await Cart.findOne(cartQuery)

    if (!cart) {
      cart = new Cart({
        ...(userId ? { userId } : { sessionId }),
        items: []
      })
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId && 
      item.variantId === variantId
    )

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      if (newQuantity > 99) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Cannot add more items. Maximum quantity per item is 99'
        }, { status: 400 })
      }
      
      // Check if new quantity exceeds available inventory
      if (newQuantity > availableInventory) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Cannot add more items. Only ${availableInventory} items available in stock`
        }, { status: 400 })
      }
      
      cart.items[existingItemIndex].quantity = newQuantity
    } else {
      // Add new item to cart
      cart.items.push({
        productId: product._id,
        variantId,
        quantity,
        price,
        name: product.name,
        image: product.images[0],
        size,
        color
      })
    }

    await cart.save()

    // Set session cookie for guest users
    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          itemCount: cart.itemCount
        }
      },
      message: 'Item added to cart successfully'
    })

    if (!userId && sessionId) {
      response.cookies.set('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })
    }

    return response

  } catch (error) {
    console.error('Add to cart error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to add item to cart'
    }, { status: 500 })
  }
}