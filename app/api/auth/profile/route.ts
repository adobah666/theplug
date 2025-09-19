import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { ApiResponse } from '@/types'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'

// Protected route that requires authentication
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.user.id)
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

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
}

// Update user profile (also protected)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.user.id)
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone } = body

    // Validate input
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length < 1) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'First name is required'
        }, { status: 400 })
      }
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length < 1) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Last name is required'
        }, { status: 400 })
      }
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Please enter a valid email address'
        }, { status: 400 })
      }
    }

    if (phone !== undefined && phone !== '') {
      if (typeof phone !== 'string' || !/^\+?[\d\s\-\(\)]{10,}$/.test(phone.trim())) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Please enter a valid phone number'
        }, { status: 400 })
      }
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName.trim()
    if (lastName !== undefined) user.lastName = lastName.trim()
    if (email !== undefined) user.email = email.trim()
    if (phone !== undefined) user.phone = phone.trim()

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
}