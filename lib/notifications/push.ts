// Push notification utilities for PWA

export interface NotificationPayload {
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

export class PushNotificationService {
  private static instance: PushNotificationService
  private registration: ServiceWorkerRegistration | null = null

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.ready
      return true
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      return null
    }

    try {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        return null
      }

      // You would need to generate VAPID keys for production
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'demo-key'
      
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)
      
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      return null
    }

    try {
      return await this.registration.pushManager.getSubscription()
    } catch (error) {
      console.error('Failed to get push subscription:', error)
      return null
    }
  }

  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      return
    }

    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      return
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      image: payload.image,
      data: payload.data,
      actions: payload.actions,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      vibrate: [200, 100, 200]
    }

    await this.registration.showNotification(payload.title, options)
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Order notification helpers
export const OrderNotifications = {
  orderConfirmed: (orderNumber: string) => ({
    title: 'Order Confirmed! 🎉',
    body: `Your order #${orderNumber} has been confirmed and is being processed.`,
    data: { type: 'order_confirmed', orderNumber },
    actions: [
      { action: 'view_order', title: 'View Order' },
      { action: 'track_order', title: 'Track Order' }
    ],
    tag: `order_${orderNumber}`
  }),

  orderShipped: (orderNumber: string, trackingNumber?: string) => ({
    title: 'Order Shipped! 📦',
    body: `Your order #${orderNumber} is on its way!${trackingNumber ? ` Tracking: ${trackingNumber}` : ''}`,
    data: { type: 'order_shipped', orderNumber, trackingNumber },
    actions: [
      { action: 'track_order', title: 'Track Package' },
      { action: 'view_order', title: 'View Order' }
    ],
    tag: `order_${orderNumber}`
  }),

  orderDelivered: (orderNumber: string) => ({
    title: 'Order Delivered! ✅',
    body: `Your order #${orderNumber} has been delivered. Enjoy your new items!`,
    data: { type: 'order_delivered', orderNumber },
    actions: [
      { action: 'rate_order', title: 'Rate Items' },
      { action: 'view_order', title: 'View Order' }
    ],
    tag: `order_${orderNumber}`
  }),

  priceAlert: (productName: string, newPrice: number, originalPrice: number) => ({
    title: 'Price Drop Alert! 💰',
    body: `${productName} is now $${newPrice} (was $${originalPrice})`,
    data: { type: 'price_alert', productName, newPrice, originalPrice },
    actions: [
      { action: 'view_product', title: 'View Product' },
      { action: 'add_to_cart', title: 'Add to Cart' }
    ],
    tag: 'price_alert'
  }),

  backInStock: (productName: string) => ({
    title: 'Back in Stock! 🔄',
    body: `${productName} is now available again. Get it before it sells out!`,
    data: { type: 'back_in_stock', productName },
    actions: [
      { action: 'view_product', title: 'View Product' },
      { action: 'add_to_cart', title: 'Add to Cart' }
    ],
    tag: 'back_in_stock'
  }),

  newArrivals: (count: number) => ({
    title: 'New Arrivals! ✨',
    body: `${count} new items just arrived. Check out the latest fashion trends!`,
    data: { type: 'new_arrivals', count },
    actions: [
      { action: 'view_new_arrivals', title: 'Shop Now' }
    ],
    tag: 'new_arrivals'
  }),

  saleAlert: (discount: number) => ({
    title: `${discount}% Off Sale! 🏷️`,
    body: `Don't miss out on our biggest sale of the season. Limited time only!`,
    data: { type: 'sale_alert', discount },
    actions: [
      { action: 'view_sale', title: 'Shop Sale' }
    ],
    tag: 'sale_alert'
  })
}

export default PushNotificationService