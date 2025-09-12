import { sign, verify, decode, type SignOptions, type JwtPayload } from 'jsonwebtoken'

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
  // Cast payload to a plain object to satisfy jsonwebtoken typings
  const data: Record<string, unknown> = {
    userId: payload.userId,
    email: payload.email,
  }
  const options: SignOptions = { expiresIn: getJWTExpiresIn() as unknown as any }
  return sign(data, getJWTSecret(), options) as string
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = verify(token, getJWTSecret()) as JwtPayload | string
    if (typeof decoded === 'string') {
      throw new Error('Invalid token payload')
    }
    return decoded as unknown as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const d = decode(token) as JwtPayload | null
    if (!d || typeof d === 'string') return null
    return d as unknown as JWTPayload
  } catch (error) {
    return null
  }
}