import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { validatePasswordStrength } from '@/lib/auth/password'
import { ApiResponse } from '@/types'

interface RegisterRequest {
  email: string
  name: string
  phone?: string
  gender?: 'male' | 'female'
  password: string
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB()

    // Parse request body
    const body: RegisterRequest = await request.json()
    const { email, name, phone, gender, password } = body

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email, name, and password are required'
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

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Password does not meet requirements',
        data: { errors: passwordValidation.errors }
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User with this email already exists'
      }, { status: 409 })
    }

    // Split name into first and last name
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || firstName

    // Create new user (password will be hashed by pre-save middleware)
    const newUser = new User({
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: phone?.trim(),
      ...(gender ? { gender } : {}),
      password
    })

    await newUser.save()

    // Send welcome email
    try {
      const { emailNotificationService } = await import('@/lib/email');
      await emailNotificationService.queueWelcomeEmail(newUser.email, {
        customerName: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account`
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Return user data without password
    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      gender: newUser.gender,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'User registered successfully',
      data: { user: userResponse }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
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