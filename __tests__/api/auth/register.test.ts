import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { NextRequest } from 'next/server'

describe('/api/auth/register', () => {
  beforeEach(async () => {
    await connectDB()
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
  })

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } })
  })

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test1@example.com',
      name: 'Test User',
      phone: '+1234567890',
      password: 'TestPassword123!'
    }

    const request = createRequest(userData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.message).toBe('User registered successfully')
    expect(data.data.user).toMatchObject({
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      emailVerified: false
    })
    expect(data.data.user.password).toBeUndefined()
    expect(data.data.user.id).toBeDefined()
    expect(data.data.user.createdAt).toBeDefined()
  })

  it('should register a user without phone number', async () => {
    const userData = {
      email: 'test2@example.com',
      name: 'Test User 2',
      password: 'TestPassword123!'
    }

    const request = createRequest(userData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.user.phone).toBeUndefined()
  })

  it('should return error for missing required fields', async () => {
    const testCases = [
      { email: 'test@example.com', name: 'Test' }, // missing password
      { email: 'test@example.com', password: 'TestPassword123!' }, // missing name
      { name: 'Test', password: 'TestPassword123!' }, // missing email
      {} // missing all fields
    ]

    for (const userData of testCases) {
      const request = createRequest(userData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email, name, and password are required')
    }
  })

  it('should return error for invalid email format', async () => {
    const userData = {
      email: 'invalid-email',
      name: 'Test User',
      password: 'TestPassword123!'
    }

    const request = createRequest(userData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Please enter a valid email address')
  })

  it('should return error for weak password', async () => {
    const weakPasswords = [
      'short', // too short
      'nouppercase123!', // no uppercase
      'NOLOWERCASE123!', // no lowercase
      'NoNumbers!', // no numbers
      'NoSpecialChars123' // no special characters
    ]

    for (const password of weakPasswords) {
      const userData = {
        email: `test-weak-${Date.now()}@example.com`,
        name: 'Test User',
        password
      }

      const request = createRequest(userData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Password does not meet requirements')
      expect(data.data.errors).toBeDefined()
      expect(Array.isArray(data.data.errors)).toBe(true)
    }
  })

  it('should return error for duplicate email', async () => {
    const userData = {
      email: 'test-duplicate@example.com',
      name: 'Test User',
      password: 'TestPassword123!'
    }

    // Create first user
    const request1 = createRequest(userData)
    const response1 = await POST(request1)
    expect(response1.status).toBe(201)

    // Try to create second user with same email
    const request2 = createRequest(userData)
    const response2 = await POST(request2)
    const data2 = await response2.json()

    expect(response2.status).toBe(409)
    expect(data2.success).toBe(false)
    expect(data2.error).toBe('User with this email already exists')
  })

  it('should handle case insensitive email uniqueness', async () => {
    const userData1 = {
      email: 'Test-Case@Example.com',
      name: 'Test User 1',
      password: 'TestPassword123!'
    }

    const userData2 = {
      email: 'test-case@example.com',
      name: 'Test User 2',
      password: 'TestPassword123!'
    }

    // Create first user
    const request1 = createRequest(userData1)
    const response1 = await POST(request1)
    expect(response1.status).toBe(201)

    // Try to create second user with same email (different case)
    const request2 = createRequest(userData2)
    const response2 = await POST(request2)
    const data2 = await response2.json()

    expect(response2.status).toBe(409)
    expect(data2.success).toBe(false)
    expect(data2.error).toBe('User with this email already exists')
  })

  it('should store email in lowercase', async () => {
    const userData = {
      email: 'Test-Lowercase@Example.COM',
      name: 'Test User',
      password: 'TestPassword123!'
    }

    const request = createRequest(userData)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.user.email).toBe('test-lowercase@example.com')
  })

  it('should hash password before storing', async () => {
    const userData = {
      email: 'test-password-hash@example.com',
      name: 'Test User',
      password: 'TestPassword123!'
    }

    const request = createRequest(userData)
    const response = await POST(request)
    expect(response.status).toBe(201)

    // Verify password is hashed in database
    const user = await User.findOne({ email: userData.email }).select('+password')
    expect(user).toBeTruthy()
    expect(user!.password).not.toBe(userData.password)
    expect(user!.password).toMatch(/^\$2[aby]\$\d+\$/)
  })

  it('should handle malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json'
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})