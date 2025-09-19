import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await connectDB()
    
    // Test user model query (without exposing sensitive data)
    const userCount = await User.countDocuments()
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Authentication system healthy',
      data: {
        database: 'connected',
        userModel: 'accessible',
        userCount: userCount > 0 ? 'has users' : 'no users',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Auth health check failed:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Authentication system unhealthy',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}