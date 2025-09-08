import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { connectDB } from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    
    // Remove push subscription from user
    await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        $unset: { pushSubscription: 1 },
        $set: { 
          notificationsEnabled: false,
          updatedAt: new Date()
        }
      },
      { upsert: false }
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Push notifications disabled successfully' 
    })

  } catch (error) {
    console.error('Unsubscribe from notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to disable notifications' },
      { status: 500 }
    )
  }
}