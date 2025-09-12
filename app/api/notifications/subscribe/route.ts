import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription } = await request.json()
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription data required' }, { status: 400 })
    }

    await connectDB()
    
    // Update user with push subscription
    await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        $set: { 
          pushSubscription: subscription,
          notificationsEnabled: true,
          updatedAt: new Date()
        }
      },
      { upsert: false }
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Push notifications enabled successfully' 
    })

  } catch (error) {
    console.error('Subscribe to notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to enable notifications' },
      { status: 500 }
    )
  }
}