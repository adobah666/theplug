import jwt from 'jsonwebtoken'

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}

function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d'
}

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  })
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch (error) {
    return null
  }
}