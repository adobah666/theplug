import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import connectDB from '@/lib/db/connection'
import User, { IUser } from '@/lib/db/models/User'
import { ApiResponse } from '@/types'

export interface AuthenticatedRequest extends NextRequest {
  user?: IUser
  userId?: string
}

export interface AuthContext {
  user: IUser
  userId: string
}

/**
 * Middleware function to authenticate requests using JWT tokens
 * Extracts token from Authorization header and verifies it
 */
export async function authenticateToken(request: NextRequest): Promise<{
  success: boolean
  user?: IUser
  userId?: string
  error?: string
  response?: NextResponse
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return {
        success: false,
        error: 'Authorization header is required',
        response: NextResponse.json<ApiResponse>({
          success: false,
          error: 'Authorization header is required'
        }, { status: 401 })
      }
    }

    // Check if header follows "Bearer <token>" format
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/)
    if (!tokenMatch) {
      return {
        success: false,
        error: 'Invalid authorization header format. Use: Bearer <token>',
        response: NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid authorization header format. Use: Bearer <token>'
        }, { status: 401 })
      }
    }

    const token = tokenMatch[1].trim()
    
    // Check if token is empty after trimming
    if (!token) {
      return {
        success: false,
        error: 'Invalid or expired token',
        response: NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid or expired token'
        }, { status: 401 })
      }
    }

    // Verify JWT token
    let decodedToken: JWTPayload
    try {
      decodedToken = verifyToken(token)
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired token',
        response: NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid or expired token'
        }, { status: 401 })
      }
    }

    // Connect to database and fetch user
    await connectDB()
    const user = await User.findById(decodedToken.userId)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        response: NextResponse.json<ApiResponse>({
          success: false,
          error: 'User not found'
        }, { status: 401 })
      }
    }

    return {
      success: true,
      user,
      userId: user._id.toString()
    }

  } catch (error) {
    console.error('Authentication middleware error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication failed'
      }, { status: 500 })
    }
  }
}

/**
 * Higher-order function that wraps API route handlers with authentication
 * Usage: export const GET = withAuth(async (request, { user, userId }) => { ... })
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateToken(request)
    
    if (!authResult.success) {
      return authResult.response!
    }

    // Add user context to the request and call the original handler
    const context: AuthContext = {
      user: authResult.user!,
      userId: authResult.userId!
    }

    return handler(request, context, ...args)
  }
}

/**
 * Utility function to extract user context from request in authenticated routes
 * This is a convenience function for routes that use the withAuth wrapper
 */
export function getUserFromRequest(request: AuthenticatedRequest): AuthContext | null {
  if (!request.user || !request.userId) {
    return null
  }

  return {
    user: request.user,
    userId: request.userId
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for routes that work for both authenticated and unauthenticated users
 */
export async function optionalAuth(request: NextRequest): Promise<{
  user?: IUser
  userId?: string
}> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return {}
  }

  const authResult = await authenticateToken(request)
  
  if (authResult.success) {
    return {
      user: authResult.user,
      userId: authResult.userId
    }
  }

  // Return empty object if authentication fails (don't throw error)
  return {}
}