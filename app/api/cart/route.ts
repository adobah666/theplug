import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import Cart from '@/lib/db/models/Cart'
import { verifyToken } from '@/lib/auth/jwt'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
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
        // No session ID, return empty cart
        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            cart: {
              id: null,
              items: [],
              subtotal: 0,
              itemCount: 0
            }
          }
        })
      }
    }

    // Find cart
    const cartQuery = userId ? { userId } : { sessionId }
    const cart = await Cart.findOne(cartQuery).populate({
      path: 'items.productId',
      select: 'name price images inventory variants'
    })

    if (!cart) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          cart: {
            id: null,
            items: [],
            subtotal: 0,
            itemCount: 0
          }
        }
      })
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
        }
      }
    })

  } catch (error) {
    console.error('Get cart error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to retrieve cart'
    }, { status: 500 })
  }
}