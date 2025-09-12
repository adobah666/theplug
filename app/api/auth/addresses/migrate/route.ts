import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import connectDB from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import Order from '@/lib/db/models/Order'

// POST /api/auth/addresses/migrate - Migrate shipping addresses from order history to saved addresses
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !(token as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (token as any).id
    
    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all orders for this user
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean()
    
    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        message: 'No orders found to migrate addresses from',
        addressesAdded: 0 
      })
    }

    const existingAddresses = user.addresses || []
    const newAddresses: any[] = []
    const seenAddresses = new Set<string>()

    // Add existing addresses to seen set
    existingAddresses.forEach((addr: any) => {
      const key = `${addr.street}|${addr.city}|${addr.state}`.toLowerCase()
      seenAddresses.add(key)
    })

    // Process orders to extract unique shipping addresses
    for (const order of orders) {
      const shipping = order.shippingAddress
      if (!shipping || !shipping.street || !shipping.city || !shipping.state) continue

      const addressKey = `${shipping.street}|${shipping.city}|${shipping.state}`.toLowerCase()
      
      if (seenAddresses.has(addressKey)) continue
      seenAddresses.add(addressKey)

      // Parse recipient name
      const recipientName = shipping.recipientName || ''
      const nameParts = recipientName.trim().split(' ')
      const firstName = nameParts[0] || 'Customer'
      const lastName = nameParts.slice(1).join(' ') || ''

      const newAddress = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
        firstName,
        lastName,
        street: shipping.street,
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.zipCode || '',
        country: shipping.country || 'Ghana',
        isDefault: newAddresses.length === 0 && existingAddresses.length === 0, // First address becomes default if no existing addresses
      }

      newAddresses.push(newAddress)
    }

    if (newAddresses.length === 0) {
      return NextResponse.json({ 
        message: 'No new addresses to migrate - all order addresses already saved',
        addressesAdded: 0 
      })
    }

    // Add new addresses to user
    user.addresses = [...existingAddresses, ...newAddresses]
    await user.save()

    return NextResponse.json({
      message: `Successfully migrated ${newAddresses.length} addresses from order history`,
      addressesAdded: newAddresses.length,
      addresses: newAddresses
    })

  } catch (error) {
    console.error('Address migration error:', error)
    return NextResponse.json(
      { error: 'Failed to migrate addresses' },
      { status: 500 }
    )
  }
}
