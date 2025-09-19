import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

/**
 * Cleanup endpoint to clear authentication cookies and session data
 * This helps resolve issues where users can't login after logout
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: 'Authentication data cleared'
    })

    // Clear all NextAuth cookies
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.callback-url', 
      'next-auth.csrf-token',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token'
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })

    return response
  } catch (error) {
    console.error('Auth cleanup error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to cleanup authentication data'
    }, { status: 500 })
  }
}