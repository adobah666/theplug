import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { signToken } from '@/lib/auth/jwt'
import { ApiResponse } from '@/types'

interface LoginRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB()

    // Parse request body
    const body: LoginRequest = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 })
    }

    // Find user by email and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Update last login timestamp
    user.lastLogin = new Date()
    await user.save()

    // Generate JWT token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email
    })

    // Return user data and token (excluding password)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Login successful',
      data: { 
        user: userResponse,
        token 
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    
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
      error: 'Internal server error'
    }, { status: 500 })
  }
}