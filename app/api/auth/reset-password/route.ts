import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { passwordResetSchema } from '@/lib/auth/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = passwordResetSchema.parse(body)
    
    await connectDB()
    
    // Check if user exists
    const user = await User.findOne({ email: validatedData.email })
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      )
    }

    // Generate secure reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now
    
    // Store reset token in user document
    user.resetToken = resetToken
    user.resetTokenExpiry = resetTokenExpiry
    await user.save()
    
    // Send password reset email
    try {
      const { emailNotificationService } = await import('@/lib/email');
      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
      
      await emailNotificationService.queuePasswordReset(user.email, {
        customerName: `${user.firstName} ${user.lastName}`,
        resetUrl,
        expiresIn: '1 hour'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway - don't reveal email sending failure
    }
    
    console.log(`Password reset requested for: ${validatedData.email}`)
    
    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Password reset error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}