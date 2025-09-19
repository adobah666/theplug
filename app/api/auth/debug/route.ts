import { NextRequest, NextResponse } from 'next/server'
import { getAuthDebugInfo } from '@/lib/auth/debug'
import connectDB from '@/lib/db/connection'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  // Only allow in development or with special debug header
  const isDebugAllowed = process.env.NODE_ENV === 'development' || 
                        request.headers.get('x-debug-auth') === process.env.DEBUG_AUTH_KEY

  if (!isDebugAllowed) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Debug endpoint not available'
    }, { status: 404 })
  }

  try {
    const debugInfo = getAuthDebugInfo(request)
    
    // Test database connection
    let dbStatus = 'unknown'
    try {
      await connectDB()
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = `failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Authentication debug info',
      data: {
        ...debugInfo,
        databaseStatus: dbStatus,
        envVars: {
          nodeEnv: process.env.NODE_ENV,
          hasMongoUri: !!process.env.MONGODB_URI,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          mongoDbName: process.env.MONGODB_DB_NAME || 'not set'
        }
      }
    })
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to get debug info',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 })
  }
}