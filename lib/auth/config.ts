import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import User from '@/lib/db/models/User'
import { comparePassword } from '@/lib/auth/password'
import connectDB from '@/lib/db/connection'
import { logAuthAttempt, logAuthError, getAuthDebugInfo } from '@/lib/auth/debug'

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required')
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required')
}

const client = new MongoClient(process.env.MONGODB_URI)

export const authOptions: NextAuthOptions = {
  // Cast to any to avoid type mismatch between next-auth and @auth adapter typings
  adapter: MongoDBAdapter(client) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const debugInfo = getAuthDebugInfo()
        
        if (!credentials?.email || !credentials?.password) {
          const error = new Error('Email and password are required')
          logAuthError(error, 'missing_credentials', debugInfo)
          throw error
        }

        try {
          await connectDB()
          
          // Select password explicitly as it is select:false in the schema
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password')
          if (!user) {
            logAuthAttempt(credentials.email, false, 'User not found', debugInfo)
            throw new Error('Invalid email or password')
          }

          // Use the user model's comparePassword method
          const isValidPassword = await user.comparePassword(credentials.password)
          if (!isValidPassword) {
            logAuthAttempt(credentials.email, false, 'Invalid password', debugInfo)
            throw new Error('Invalid email or password')
          }

          // Update last login
          user.lastLogin = new Date()
          await user.save()

          logAuthAttempt(credentials.email, true, undefined, debugInfo)

          return {
            id: user._id.toString(),
            email: user.email,
            // next-auth User requires a name field
            name: `${user.firstName} ${user.lastName}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: (user as any).role,
          }
        } catch (error) {
          const authError = error instanceof Error ? error : new Error('Unknown authentication error')
          
          // Check for specific error types and provide better messages
          if (authError.message.includes('ECONNREFUSED') || authError.message.includes('MongoNetworkError')) {
            const dbError = new Error('Database connection failed. Please try again later.')
            logAuthError(dbError, 'database_connection', debugInfo)
            throw dbError
          }
          
          if (authError.message.includes('timeout') || authError.message.includes('ETIMEDOUT')) {
            const timeoutError = new Error('Request timeout. Please try again.')
            logAuthError(timeoutError, 'timeout', debugInfo)
            throw timeoutError
          }
          
          if (authError.message.includes('Invalid email or password')) {
            // Don't log this as an error - it's expected for invalid credentials
            throw authError
          }
          
          if (authError.message.includes('Password comparison failed')) {
            const compError = new Error('Authentication service error. Please try again.')
            logAuthError(compError, 'password_comparison', debugInfo)
            throw compError
          }
          
          // Log unexpected errors with full context
          logAuthError(authError, 'unexpected_error', debugInfo)
          throw new Error('Authentication service temporarily unavailable. Please try again later.')
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const t = token as any
        t.id = (user as any).id
        t.phone = (user as any).phone
        t.firstName = (user as any).firstName
        t.lastName = (user as any).lastName
        t.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const t = token as any
        ;(session.user as any).id = t.id
        ;(session.user as any).phone = t.phone
        ;(session.user as any).firstName = t.firstName
        ;(session.user as any).lastName = t.lastName
        ;(session.user as any).role = t.role
      }
      return session
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        timestamp: new Date().toISOString()
      })
    },
    async signOut({ session, token }) {
      console.log('User signed out:', {
        userId: session?.user?.id || token?.id,
        timestamp: new Date().toISOString()
      })
    },
    async signInError({ error }) {
      console.error('Sign in error:', {
        error: error.message,
        type: error.type,
        timestamp: new Date().toISOString()
      })
    }
  },
  pages: {
    // We created /login page
    signIn: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', { code, metadata, timestamp: new Date().toISOString() })
    },
    warn(code) {
      console.warn('NextAuth Warning:', { code, timestamp: new Date().toISOString() })
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('NextAuth Debug:', { code, metadata, timestamp: new Date().toISOString() })
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}