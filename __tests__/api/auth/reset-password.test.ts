import { POST } from '@/app/api/auth/reset-password/route'
import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { vi } from 'vitest'

// Mock database connection and User model
vi.mock('@/lib/db/connection', () => ({
  connectDB: vi.fn()
}))

vi.mock('@/lib/db/models/User', () => ({
  User: {
    findOne: vi.fn()
  }
}))

const mockConnectDB = vi.mocked(connectDB)
const mockUser = vi.mocked(User)

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectDB.mockResolvedValue(undefined)
  })

  it('returns success message for valid email', async () => {
    const mockUserDoc = {
      _id: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    }

    mockUser.findOne.mockResolvedValue(mockUserDoc)

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('If an account with that email exists, we have sent a password reset link.')
    expect(mockConnectDB).toHaveBeenCalled()
    expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
  })

  it('returns success message even for non-existent email (security)', async () => {
    mockUser.findOne.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('If an account with that email exists, we have sent a password reset link.')
    expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' })
  })

  it('returns 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Invalid email address')
  })

  it('returns 400 for missing email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Invalid email address')
  })

  it('returns 500 for database connection error', async () => {
    mockConnectDB.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.message).toBe('Failed to process password reset request')
  })

  it('returns 500 for user lookup error', async () => {
    mockConnectDB.mockResolvedValue(undefined)
    mockUser.findOne.mockRejectedValue(new Error('Database query failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.message).toBe('Failed to process password reset request')
  })

  it('handles malformed JSON request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.message).toBe('Failed to process password reset request')
  })
})