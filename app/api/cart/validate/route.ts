import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import { verifyToken } from '@/lib/auth/jwt'
import { validateCartItems, validateCartTotals } from '@/lib/cart/validation'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

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
        success: true,
        data: {
          cart: {
            id: null,
            items: [],
            subtotal: 0,
            itemCount: 0
          },
          validation: {
            isValid: true,
            removedItems: [],
            updatedItems: [],
            errors: []
          }
        },
        message: 'No cart to validate'
      })
    }

    // Validate cart items
    const validationResult = await validateCartItems(cart)
    
    // Validate and fix cart totals
    const totalsValid = validateCartTotals(cart)
    if (!totalsValid) {
      validationResult.isValid = false
      validationResult.errors.push('Cart totals have been recalculated')
    }

    // Save cart if any changes were made
    if (!validationResult.isValid) {
      await cart.save()
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          subtotal: cart.subtotal,
          itemCount: cart.itemCount,
          updatedAt: cart.updatedAt
        },
        validation: validationResult
      },
      message: validationResult.isValid ? 'Cart is valid' : 'Cart has been updated'
    })

  } catch (error) {
    console.error('Cart validation error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to validate cart'
    }, { status: 500 })
  }
}