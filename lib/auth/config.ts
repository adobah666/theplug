import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import User from '@/lib/db/models/User'
import { comparePassword } from '@/lib/auth/password'
import connectDB from '@/lib/db/connection'

const client = new MongoClient(process.env.MONGODB_URI!)

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
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
          
          const user = await User.findOne({ email: credentials.email })
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
            name: user.name,
            phone: user.phone,
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
        token.id = user.id
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.phone = token.phone as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}