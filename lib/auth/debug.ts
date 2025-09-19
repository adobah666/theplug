/**
 * Authentication debugging utilities
 * These help diagnose login issues in production
 */

export interface AuthDebugInfo {
  timestamp: string
  environment: string
  mongodbConnected: boolean
  nextauthSecret: boolean
  userAgent?: string
  ip?: string
}

export function getAuthDebugInfo(request?: Request): AuthDebugInfo {
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    mongodbConnected: !!process.env.MONGODB_URI,
    nextauthSecret: !!process.env.NEXTAUTH_SECRET,
    userAgent: request?.headers.get('user-agent') || undefined,
    ip: request?.headers.get('x-forwarded-for') || 
        request?.headers.get('x-real-ip') || 
        'unknown'
  }
}

export function logAuthAttempt(email: string, success: boolean, error?: string, debugInfo?: AuthDebugInfo) {
  const logData = {
    event: 'auth_attempt',
    email: email.toLowerCase(),
    success,
    error,
    debugInfo: debugInfo || getAuthDebugInfo(),
  }

  if (success) {
    console.log('Authentication successful:', logData)
  } else {
    console.error('Authentication failed:', logData)
  }
}

export function logAuthError(error: Error, context: string, debugInfo?: AuthDebugInfo) {
  console.error('Authentication error:', {
    event: 'auth_error',
    context,
    error: {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    debugInfo: debugInfo || getAuthDebugInfo(),
  })
}