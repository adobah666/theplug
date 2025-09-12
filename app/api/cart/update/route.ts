import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import Product from '@/lib/db/models/Product'
import { verifyToken } from '@/lib/auth/jwt'
import { checkInventoryAvailability } from '@/lib/cart/validation'
import { ApiResponse } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import type { ICartItem } from '@/lib/db/models/Cart'

interface UpdateCartRequest {
  itemId: string
  quantity: number
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const body: UpdateCartRequest = await request.json()
    const { itemId, quantity } = body

    // Validate required fields
    if (!itemId || quantity === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Item ID and quantity are required'
      }, { status: 400 })
    }

    // Validate quantity
    if (quantity < 0 || quantity > 99) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Quantity must be between 0 and 99'
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

    // For guest users, use session ID from cookies
    if (!userId) {
      sessionId = request.cookies.get('sessionId')?.value || null
      if (!sessionId) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'No cart found'
        }, { status: 404 })
      }
    }

    // Find cart
    const cartQuery = userId ? { userId } : { sessionId }
    const cart = await Cart.findOne(cartQuery)

    if (!cart) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cart not found'
      }, { status: 404 })
    }

    // Find the item in cart
    const itemIndex = cart.items.findIndex((item: ICartItem) => item._id?.toString() === itemId)
    
    if (itemIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Item not found in cart'
      }, { status: 404 })
    }

    const cartItem = cart.items[itemIndex]

    // Update quantity or remove item if quantity is 0
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1)
    } else {
      // Check inventory availability for the new quantity
      const inventoryCheck = await checkInventoryAvailability(
        cartItem.productId.toString(),
        quantity,
        cartItem.variantId
      )

      if (!inventoryCheck.available) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: inventoryCheck.error || 'Insufficient inventory'
        }, { status: 400 })
      }

      cart.items[itemIndex].quantity = quantity
    }

    await cart.save()

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          itemCount: cart.itemCount
        }
      },
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated successfully'
    })

  } catch (error) {
    console.error('Update cart error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update cart'
    }, { status: 500 })
  }
}