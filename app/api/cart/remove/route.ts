import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import { verifyToken } from '@/lib/auth/jwt'
import { ApiResponse } from '@/types'

interface RemoveFromCartRequest {
  itemId: string
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const body: RemoveFromCartRequest = await request.json()
    const { itemId } = body

    // Validate required fields
    if (!itemId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    // Get user ID from token or use session ID for guest users
    let userId: string | null = null
    let sessionId: string | null = null

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

    // For guest users, use session ID from cookies
    if (!userId) {
      sessionId = request.cookies.get('sessionId')?.value
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

    // Find and remove the item from cart
    const itemIndex = cart.items.findIndex(item => item._id?.toString() === itemId)
    
    if (itemIndex === -1) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Item not found in cart'
      }, { status: 404 })
    }

    cart.items.splice(itemIndex, 1)
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
      message: 'Item removed from cart successfully'
    })

  } catch (error) {
    console.error('Remove from cart error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to remove item from cart'
    }, { status: 500 })
  }
}