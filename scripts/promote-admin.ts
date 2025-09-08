import { config as loadEnv } from 'dotenv'
// Prefer .env.local (Next.js convention), fallback to .env
loadEnv({ path: '.env.local' })
if (!process.env.MONGODB_URI) {
  loadEnv()
}
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: ts-node scripts/promote-admin.ts <email>')
    process.exit(1)
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Please set it in .env.local or .env')
    process.exit(1)
  }
  try {
    await connectDB()
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      console.error(`No user found with email ${email}`)
      process.exit(1)
    }

    if ((user as any).role === 'admin') {
      console.log(`User ${email} is already an admin.`)
      process.exit(0)
    }

    ;(user as any).role = 'admin'
    await user.save()
    console.log(`Promoted ${email} to admin.`)
    process.exit(0)
  } catch (err) {
    console.error('Error promoting user to admin:', err)
    process.exit(1)
  } finally {
    await mongoose.connection.close().catch(() => {})
  }
}

main()
