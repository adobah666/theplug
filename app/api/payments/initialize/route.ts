/**
 * Payment Initialization API Route
 * POST /api/payments/initialize
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Order from '../../../../lib/db/models/Order';
import { authenticateToken } from '../../../../lib/auth/middleware';
import { 
  initializePayment, 
  nairaToKobo, 
  validatePaymentData,
  type PaymentInitializationData 
} from '../../../../lib/paystack';

interface PaymentInitializeRequest {
  orderId: string;
  callbackUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authResult = await authenticateToken(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { orderId, callbackUrl }: PaymentInitializeRequest = await request.json();

    // Validate request
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order belongs to authenticated user
    if (order.userId._id.toString() !== authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to order' },
        { status: 403 }
      );
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      );
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot pay for cancelled order' },
        { status: 400 }
      );
    }

    // Prepare payment data
    const paymentData: PaymentInitializationData = {
      email: order.userId.email,
      amount: nairaToKobo(order.total), // Convert to kobo
      orderId: order._id.toString(),
      userId: order.userId._id.toString(),
      callback_url: callbackUrl,
      metadata: {
        orderId: order._id.toString(),
        userId: order.userId._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.userId.name,
      },
    };

    // Validate payment data
    const validationErrors = validatePaymentData(paymentData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: validationErrors },
        { status: 400 }
      );
    }

    // Initialize payment with Paystack
    const paymentResponse = await initializePayment(paymentData);

    // Update order with payment reference
    order.paystackReference = paymentResponse.data.reference;
    order.paymentStatus = 'pending';
    await order.save();

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paymentResponse.data.authorization_url,
        accessCode: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference,
        orderId: order._id,
        amount: order.total,
      },
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}