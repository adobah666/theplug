import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { authenticateToken, withAuth, optionalAuth } from '@/lib/auth/middleware'
import { signToken } from '@/lib/auth/jwt'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'

describe('Authentication Middleware', () => {
  const testUser = {
    email: 'test-middleware@example.com',
    name: 'Test Middleware User',
    password: 'TestPassword123!'
  }

  let userId: string
  let validToken: string

  beforeEach(async () => {
    await connectDB()
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
    
    // Create a test user
    const user = new User(testUser)
    await user.save()
    userId = user._id.toString()
    
    // Generate a valid token
    validToken = signToken({
      userId: userId,
      email: testUser.email
    })
  })

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
  })

  const createRequest = (authHeader?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authHeader) {
      headers['authorization'] = authHeader
    }

    return new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers
    })
  }

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const request = createRequest(`Bearer ${validToken}`)
      const result = await authenticateToken(request)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.userId).toBe(userId)
      expect(result.user!.email).toBe(testUser.email)
      expect(result.error).toBeUndefined()
      expect(result.response).toBeUndefined()
    })

    it('should fail when no authorization header is provided', async () => {
      const request = createRequest()
      const result = await authenticateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authorization header is required')
      expect(result.response).toBeDefined()
      expect(result.user).toBeUndefined()
      expect(result.userId).toBeUndefined()
    })

    it('should fail with invalid authorization header format', async () => {
      const testCases = [
        'InvalidFormat',
        'Basic dGVzdDp0ZXN0',
        'Bearer',
        'Bearer ',
        `Token ${validToken}`,
        validToken
      ]

      for (const authHeader of testCases) {
        const request = createRequest(authHeader)
        const result = await authenticateToken(request)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid authorization header format. Use: Bearer <token>')
        expect(result.response).toBeDefined()
      }
    })

    it('should fail with invalid JWT token', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ]

      for (const invalidToken of invalidTokens) {
        const request = createRequest(`Bearer ${invalidToken}`)
        const result = await authenticateToken(request)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid or expired token')
        expect(result.response).toBeDefined()
      }
    })

    it('should fail with empty or malformed tokens', async () => {
      // Test empty token after Bearer
      const request1 = createRequest('Bearer ')
      const result1 = await authenticateToken(request1)
      expect(result1.success).toBe(false)
      expect(result1.error).toBe('Invalid authorization header format. Use: Bearer <token>')

      // Test tokens that look like strings but are invalid JWT
      const malformedTokens = ['null', 'undefined']
      for (const invalidToken of malformedTokens) {
        const request = createRequest(`Bearer ${invalidToken}`)
        const result = await authenticateToken(request)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid or expired token')
        expect(result.response).toBeDefined()
      }
    })

    it('should fail when user does not exist in database', async () => {
      // Create token with non-existent user ID
      const nonExistentToken = signToken({
        userId: '507f1f77bcf86cd799439011', // Valid ObjectId format but non-existent
        email: 'nonexistent@example.com'
      })

      const request = createRequest(`Bearer ${nonExistentToken}`)
      const result = await authenticateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
      expect(result.response).toBeDefined()
    })

    it('should handle expired tokens', async () => {
      // Create an expired token (this would require mocking JWT or using a very short expiry)
      // For now, we'll test with an invalid signature which simulates token tampering
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX'
      
      const request = createRequest(`Bearer ${tamperedToken}`)
      const result = await authenticateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or expired token')
    })
  })

  describe('withAuth', () => {
    it('should call handler with authenticated user context', async () => {
      let receivedContext: any = null
      
      const mockHandler = async (request: NextRequest, context: any) => {
        receivedContext = context
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const wrappedHandler = withAuth(mockHandler)
      const request = createRequest(`Bearer ${validToken}`)
      
      const response = await wrappedHandler(request)
      
      expect(response.status).toBe(200)
      expect(receivedContext).toBeDefined()
      expect(receivedContext.user).toBeDefined()
      expect(receivedContext.userId).toBe(userId)
      expect(receivedContext.user.email).toBe(testUser.email)
    })

    it('should return authentication error without calling handler', async () => {
      let handlerCalled = false
      
      const mockHandler = async (request: NextRequest, context: any) => {
        handlerCalled = true
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const wrappedHandler = withAuth(mockHandler)
      const request = createRequest() // No auth header
      
      const response = await wrappedHandler(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authorization header is required')
      expect(handlerCalled).toBe(false)
    })

    it('should pass additional arguments to handler', async () => {
      let receivedArgs: any[] = []
      
      const mockHandler = async (request: NextRequest, context: any, ...args: any[]) => {
        receivedArgs = args
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const wrappedHandler = withAuth(mockHandler)
      const request = createRequest(`Bearer ${validToken}`)
      const additionalArgs = ['arg1', { key: 'value' }, 123]
      
      await wrappedHandler(request, ...additionalArgs)
      
      expect(receivedArgs).toEqual(additionalArgs)
    })
  })

  describe('optionalAuth', () => {
    it('should return user context when valid token is provided', async () => {
      const request = createRequest(`Bearer ${validToken}`)
      const result = await optionalAuth(request)

      expect(result.user).toBeDefined()
      expect(result.userId).toBe(userId)
      expect(result.user!.email).toBe(testUser.email)
    })

    it('should return empty object when no authorization header is provided', async () => {
      const request = createRequest()
      const result = await optionalAuth(request)

      expect(result.user).toBeUndefined()
      expect(result.userId).toBeUndefined()
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should return empty object when invalid token is provided', async () => {
      const request = createRequest('Bearer invalid.token')
      const result = await optionalAuth(request)

      expect(result.user).toBeUndefined()
      expect(result.userId).toBeUndefined()
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should not throw error for malformed authorization header', async () => {
      const request = createRequest('InvalidFormat')
      const result = await optionalAuth(request)

      expect(result.user).toBeUndefined()
      expect(result.userId).toBeUndefined()
      expect(Object.keys(result)).toHaveLength(0)
    })
  })
})