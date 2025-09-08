import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import User from '@/lib/db/models/User'
import { comparePassword } from '@/lib/auth/password'
import connectDB from '@/lib/db/connection'

const client = new MongoClient(process.env.MONGODB_URI!)

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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          await connectDB()
          
          // Select password explicitly as it is select:false in the schema
          const user = await User.findOne({ email: credentials.email }).select('+password')
          if (!user) {
            throw new Error('Invalid email or password')
          }

          const isValidPassword = await comparePassword(credentials.password, user.password)
          if (!isValidPassword) {
            throw new Error('Invalid email or password')
          }

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
          console.error('Authentication error:', error)
          throw new Error('Authentication failed')
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
  pages: {
    // We created /login page
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}