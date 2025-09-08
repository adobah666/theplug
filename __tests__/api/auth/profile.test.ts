import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET, PUT } from '@/app/api/auth/profile/route'
import { signToken } from '@/lib/auth/jwt'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { NextRequest } from 'next/server'

describe('/api/auth/profile', () => {
  const testUser = {
    email: 'test-profile@example.com',
    name: 'Test Profile User',
    phone: '+1234567890',
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

  const createRequest = (method: string = 'GET', body?: any, authHeader?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (authHeader) {
      headers['authorization'] = authHeader
    }

    const requestInit: RequestInit = {
      method,
      headers
    }

    if (body) {
      requestInit.body = JSON.stringify(body)
    }

    return new NextRequest('http://localhost:3000/api/auth/profile', requestInit)
  }

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const request = createRequest('GET', undefined, `Bearer ${validToken}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Profile retrieved successfully')
      expect(data.data.user).toMatchObject({
        email: testUser.email,
        name: testUser.name,
        phone: testUser.phone,
        emailVerified: false
      })
      expect(data.data.user.id).toBeDefined()
      expect(data.data.user.createdAt).toBeDefined()
      expect(data.data.user.password).toBeUndefined()
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authorization header is required')
    })

    it('should return 401 for invalid token', async () => {
      const request = createRequest('GET', undefined, 'Bearer invalid.token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should return 401 for malformed authorization header', async () => {
      const request = createRequest('GET', undefined, 'InvalidFormat')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid authorization header format. Use: Bearer <token>')
    })
  })

  describe('PUT /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '+9876543210'
      }

      const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.data.user.name).toBe(updateData.name)
      expect(data.data.user.phone).toBe(updateData.phone)
      expect(data.data.user.email).toBe(testUser.email) // Should not change

      // Verify changes in database
      const updatedUser = await User.findById(userId)
      expect(updatedUser!.name).toBe(updateData.name)
      expect(updatedUser!.phone).toBe(updateData.phone)
    })

    it('should update only name when phone is not provided', async () => {
      const updateData = {
        name: 'Only Name Updated'
      }

      const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.user.name).toBe(updateData.name)
      expect(data.data.user.phone).toBe(testUser.phone) // Should remain unchanged
    })

    it('should update only phone when name is not provided', async () => {
      const updateData = {
        phone: '+5555555555'
      }

      const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.user.phone).toBe(updateData.phone)
      expect(data.data.user.name).toBe(testUser.name) // Should remain unchanged
    })

    it('should return 400 for invalid name', async () => {
      const invalidNames = ['', 'a', '  ', null, 123, {}]

      for (const name of invalidNames) {
        const updateData = { name }
        const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Name must be at least 2 characters long')
      }
    })

    it('should return 400 for invalid phone number', async () => {
      const invalidPhones = ['123', 'abc', '123-abc', null, 123, {}]

      for (const phone of invalidPhones) {
        const updateData = { phone }
        const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Please enter a valid phone number')
      }
    })

    it('should accept valid phone number formats', async () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+1 (234) 567-8900',
        '234-567-8900',
        '+44 20 7946 0958'
      ]

      for (const phone of validPhones) {
        const updateData = { phone }
        const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
        const response = await PUT(request)

        expect(response.status).toBe(200)
      }
    })

    it('should trim whitespace from name and phone', async () => {
      const updateData = {
        name: '  Trimmed Name  ',
        phone: '  +1234567890  '
      }

      const request = createRequest('PUT', updateData, `Bearer ${validToken}`)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.user.name).toBe('Trimmed Name')
      expect(data.data.user.phone).toBe('+1234567890')
    })

    it('should return 401 for unauthenticated request', async () => {
      const updateData = { name: 'New Name' }
      const request = createRequest('PUT', updateData)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authorization header is required')
    })

    it('should handle empty update data', async () => {
      const request = createRequest('PUT', {}, `Bearer ${validToken}`)
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.name).toBe(testUser.name) // Should remain unchanged
      expect(data.data.user.phone).toBe(testUser.phone) // Should remain unchanged
    })
  })
})