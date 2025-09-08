import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connection'
import { authenticateToken } from '@/lib/auth/middleware'
import { createOrder, getUserOrders } from '@/lib/orders/service'
import { PaymentMethod } from '@/lib/db/models/Order'
import mongoose from 'mongoose'

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      cartId,
      items,
      shippingAddress,
      paymentMethod,
      tax = 0,
      shipping = 0,
      discount = 0
    } = body

    // Validate required fields
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }

    if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required' },
        { status: 400 }
      )
    }

    // Validate shipping address fields
    const requiredAddressFields = ['street', 'city', 'state', 'zipCode', 'country', 'recipientName', 'recipientPhone']
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        return NextResponse.json(
          { error: `Shipping address ${field} is required` },
          { status: 400 }
        )
      }
    }

    // Validate that either cartId or items are provided
    if (!cartId && (!items || items.length === 0)) {
      return NextResponse.json(
        { error: 'Either cartId or items must be provided' },
        { status: 400 }
      )
    }

    // Create the order
    const result = await createOrder({
      userId: authResult.userId!,
      cartId,
      items,
      shippingAddress,
      paymentMethod,
      tax: Number(tax),
      shipping: Number(shipping),
      discount: Number(discount)
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create order',
          details: result.errors
        },
        { status: 400 }
      )
    }

    // Send order confirmation email
    try {
      const { emailNotificationService } = await import('@/lib/email');
      const User = (await import('@/lib/db/models/User')).default;
      
      const user = await User.findById(authResult.userId);
      if (user) {
        await emailNotificationService.queueOrderConfirmation(user.email, {
          customerName: `${user.firstName} ${user.lastName}`,
          orderNumber: result.order!.orderNumber,
          orderDate: result.order!.createdAt.toLocaleDateString(),
          items: result.order!.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
            image: item.productImage
          })),
          subtotal: result.order!.subtotal,
          shipping: result.order!.shipping,
          tax: result.order!.tax,
          total: result.order!.total,
          shippingAddress: {
            name: result.order!.shippingAddress.recipientName,
            street: result.order!.shippingAddress.street,
            city: result.order!.shippingAddress.city,
            state: result.order!.shippingAddress.state,
            zipCode: result.order!.shippingAddress.zipCode,
            country: result.order!.shippingAddress.country
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail order creation if email fails
    }

    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        id: result.order!._id,
        orderNumber: result.order!.orderNumber,
        total: result.order!.total,
        status: result.order!.status,
        paymentStatus: result.order!.paymentStatus,
        createdAt: result.order!.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Verify authentication
    const authResult = await authenticateToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const result = await getUserOrders(authResult.userId!, page, limit)

    return NextResponse.json({
      orders: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}