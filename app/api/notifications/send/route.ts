import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'

// Lazily configure web-push to avoid build-time failures when envs are missing
let vapidConfigured = false
function configureWebPush() {
  if (vapidConfigured) return
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    console.warn('[notifications/send] VAPID keys not set; push notifications disabled')
    return
  }
  try {
    webpush.setVapidDetails('mailto:notifications@theplug.com', pub, priv)
    vapidConfigured = true
  } catch (e) {
    console.error('[notifications/send] Failed to configure web-push VAPID keys:', e)
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
}

export async function POST(request: NextRequest) {
  try {
    configureWebPush()
    // This endpoint should be protected and only accessible by admin/system
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.NOTIFICATIONS_API_KEY
    
    if (!authHeader || !apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      userIds, 
      userEmails, 
      payload, 
      sendToAll = false 
    }: {
      userIds?: string[]
      userEmails?: string[]
      payload: NotificationPayload
      sendToAll?: boolean
    } = await request.json()

    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 })
    }

    await connectDB()

    let users: any[] = []

    if (sendToAll) {
      // Send to all users with notifications enabled
      users = await User.find({
        notificationsEnabled: true,
        pushSubscription: { $exists: true }
      }).select('pushSubscription email')
    } else if (userEmails && userEmails.length > 0) {
      // Send to specific users by email
      users = await User.find({
        email: { $in: userEmails },
        notificationsEnabled: true,
        pushSubscription: { $exists: true }
      }).select('pushSubscription email')
    } else if (userIds && userIds.length > 0) {
      // Send to specific users by ID
      users = await User.find({
        _id: { $in: userIds },
        notificationsEnabled: true,
        pushSubscription: { $exists: true }
      }).select('pushSubscription email')
    } else {
      return NextResponse.json({ error: 'No target users specified' }, { status: 400 })
    }

    if (users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users found with notifications enabled',
        sent: 0 
      })
    }

    // Send notifications
    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          await webpush.sendNotification(
            user.pushSubscription,
            JSON.stringify(payload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: 'normal'
            }
          )
          return { success: true, email: user.email }
        } catch (error: any) {
          console.error(`Failed to send notification to ${user.email}:`, error)
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await User.findByIdAndUpdate(user._id, {
              $unset: { pushSubscription: 1 },
              $set: { notificationsEnabled: false }
            })
          }
          
          return { success: false, email: user.email, error: error.message }
        }
      })
    )

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length

    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `Notifications sent successfully`,
      sent: successful,
      failed: failed,
      total: users.length
    })

  } catch (error) {
    console.error('Send notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}

// Helper function to send order notifications
async function sendOrderNotification(
  userEmail: string, 
  type: 'confirmed' | 'shipped' | 'delivered',
  orderData: any
) {
  try {
    const payload: NotificationPayload = {
      title: getOrderNotificationTitle(type),
      body: getOrderNotificationBody(type, orderData),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { type: `order_${type}`, orderId: orderData.id },
      actions: [
        { action: 'view_order', title: 'View Order' },
        { action: 'track_order', title: 'Track Order' }
      ],
      tag: `order_${orderData.id}`
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NOTIFICATIONS_API_KEY}`
      },
      body: JSON.stringify({
        userEmails: [userEmail],
        payload
      })
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send order notification:', error)
    return false
  }
}

function getOrderNotificationTitle(type: string): string {
  switch (type) {
    case 'confirmed':
      return 'Order Confirmed! 🎉'
    case 'shipped':
      return 'Order Shipped! 📦'
    case 'delivered':
      return 'Order Delivered! ✅'
    default:
      return 'Order Update'
  }
}

function getOrderNotificationBody(type: string, orderData: any): string {
  switch (type) {
    case 'confirmed':
      return `Your order #${orderData.orderNumber} has been confirmed and is being processed.`
    case 'shipped':
      return `Your order #${orderData.orderNumber} is on its way!${orderData.trackingNumber ? ` Tracking: ${orderData.trackingNumber}` : ''}`
    case 'delivered':
      return `Your order #${orderData.orderNumber} has been delivered. Enjoy your new items!`
    default:
      return `Your order #${orderData.orderNumber} has been updated.`
  }
}