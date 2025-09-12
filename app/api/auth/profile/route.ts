import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { ApiResponse } from '@/types'

// Protected route that requires authentication
export const GET = withAuth(async (request: NextRequest, { user, userId }) => {
  try {
    // Return user profile data
    const userProfile = {
      id: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      emailVerified: user.emailVerified,
      addresses: user.addresses,
      wishlist: user.wishlist,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: userProfile }
    }, { status: 200 })

  } catch (error) {
    console.error('Profile retrieval error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to retrieve profile'
    }, { status: 500 })
  }
})

// Update user profile (also protected)
export const PUT = withAuth(async (request: NextRequest, { user, userId }) => {
  try {
    const body = await request.json()
    const { name, phone } = body

    // Validate input
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Name must be at least 2 characters long'
        }, { status: 400 })
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || !/^\+?[\d\s\-\(\)]{10,}$/.test(phone.trim())) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Please enter a valid phone number'
        }, { status: 400 })
      }
    }

    // Update user fields
    if (name) {
      const full = name.trim()
      const firstSpace = full.indexOf(' ')
      if (firstSpace === -1) {
        user.firstName = full
        user.lastName = user.lastName || ''
      } else {
        user.firstName = full.slice(0, firstSpace)
        user.lastName = full.slice(firstSpace + 1).trim()
      }
    }
    if (phone) user.phone = phone.trim()

    await user.save()

    // Return updated user profile
    const userProfile = {
      id: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      emailVerified: user.emailVerified,
      addresses: user.addresses,
      wishlist: user.wishlist,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Profile updated successfully',
      data: { user: userProfile }
    }, { status: 200 })

  } catch (error) {
    console.error('Profile update error:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 })
  }
})