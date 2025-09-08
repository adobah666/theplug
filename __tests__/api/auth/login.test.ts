import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/login/route'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/jwt'
import { NextRequest } from 'next/server'

describe('/api/auth/login', () => {
  const testUser = {
    email: 'test-login@example.com',
    name: 'Test Login User',
    phone: '+1234567890',
    password: 'TestPassword123!'
  }

  beforeEach(async () => {
    await connectDB()
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
    
    // Create a test user for login tests
    const user = new User(testUser)
    await user.save()
  })

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  it('should login user successfully with valid credentials', async () => {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Login successful')
    expect(data.data.user).toMatchObject({
      email: testUser.email,
      name: testUser.name,
      phone: testUser.phone,
      emailVerified: false
    })
    expect(data.data.user.password).toBeUndefined()
    expect(data.data.user.id).toBeDefined()
    expect(data.data.user.lastLogin).toBeDefined()
    expect(data.data.token).toBeDefined()

    // Verify JWT token is valid
    const decodedToken = verifyToken(data.data.token)
    expect(decodedToken.userId).toBe(data.data.user.id)
    expect(decodedToken.email).toBe(testUser.email)
  })

  it('should login user with case insensitive email', async () => {
    const loginData = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.user.email).toBe(testUser.email.toLowerCase())
  })

  it('should update lastLogin timestamp on successful login', async () => {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    }

    // Get initial lastLogin (should be undefined)
    const userBefore = await User.findOne({ email: testUser.email })
    expect(userBefore!.lastLogin).toBeUndefined()

    const request = createRequest(loginData)
    const response = await POST(request)
    expect(response.status).toBe(200)

    // Check that lastLogin was updated
    const userAfter = await User.findOne({ email: testUser.email })
    expect(userAfter!.lastLogin).toBeDefined()
    expect(userAfter!.lastLogin).toBeInstanceOf(Date)
  })

  it('should return error for missing required fields', async () => {
    const testCases = [
      { email: testUser.email }, // missing password
      { password: testUser.password }, // missing email
      {} // missing both fields
    ]

    for (const loginData of testCases) {
      const request = createRequest(loginData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    }
  })

  it('should return error for invalid email format', async () => {
    const loginData = {
      email: 'invalid-email',
      password: testUser.password
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Please enter a valid email address')
  })

  it('should return error for non-existent user', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: testUser.password
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid email or password')
  })

  it('should return error for incorrect password', async () => {
    const loginData = {
      email: testUser.email,
      password: 'WrongPassword123!'
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid email or password')
  })

  it('should not update lastLogin on failed login attempt', async () => {
    const loginData = {
      email: testUser.email,
      password: 'WrongPassword123!'
    }

    // Get initial lastLogin (should be undefined)
    const userBefore = await User.findOne({ email: testUser.email })
    expect(userBefore!.lastLogin).toBeUndefined()

    const request = createRequest(loginData)
    const response = await POST(request)
    expect(response.status).toBe(401)

    // Check that lastLogin was not updated
    const userAfter = await User.findOne({ email: testUser.email })
    expect(userAfter!.lastLogin).toBeUndefined()
  })

  it('should handle malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json'
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('should return consistent error message for security', async () => {
    // Test both non-existent user and wrong password scenarios
    // Both should return the same error message for security
    const testCases = [
      {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      },
      {
        email: testUser.email,
        password: 'WrongPassword123!'
      }
    ]

    for (const loginData of testCases) {
      const request = createRequest(loginData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid email or password')
    }
  })

  it('should generate valid JWT token with correct payload', async () => {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    }

    const request = createRequest(loginData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    const token = data.data.token
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')

    // Verify token structure and payload
    const decodedToken = verifyToken(token)
    expect(decodedToken.userId).toBeDefined()
    expect(decodedToken.email).toBe(testUser.email)
    expect(decodedToken.iat).toBeDefined()
    expect(decodedToken.exp).toBeDefined()
    expect(decodedToken.exp! > decodedToken.iat!).toBe(true)
  })
})