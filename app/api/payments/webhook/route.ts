/**
 * Paystack Webhook Handler
 * POST /api/payments/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Order from '../../../../lib/db/models/Order';
import { 
  verifyWebhookSignature,
  parseWebhookPayload,
  extractOrderInfo,
  validateWebhookEvent,
  isPaymentSuccessEvent,
  isPaymentFailureEvent,
  koboToNaira,
  type PaystackWebhookEvent 
} from '../../../../lib/paystack';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body and signature
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing Paystack signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(body, signature);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const webhookEvent = parseWebhookPayload(body);
    if (!webhookEvent) {
      console.error('Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Validate webhook event
    const validationErrors = validateWebhookEvent(webhookEvent);
    if (validationErrors.length > 0) {
      console.error('Webhook validation errors:', validationErrors);
      return NextResponse.json(
        { error: 'Invalid webhook event', details: validationErrors },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Extract order information
    const orderInfo = extractOrderInfo(webhookEvent);
    
    // Find the order
    let order;
    if (orderInfo.orderId) {
      order = await Order.findById(orderInfo.orderId);
    } else {
      order = await Order.findOne({ paystackReference: orderInfo.reference });
    }

    if (!order) {
      console.error('Order not found for webhook:', orderInfo);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Process webhook event based on type
    await processWebhookEvent(webhookEvent, order, orderInfo);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process different types of webhook events
 */
async function processWebhookEvent(
  webhookEvent: PaystackWebhookEvent,
  order: any,
  orderInfo: any
) {
  const { event, data } = webhookEvent;

  console.log(`Processing webhook event: ${event} for order: ${order._id}`);

  switch (event) {
    case 'charge.success':
      if (data.status === 'success') {
        await handleSuccessfulPayment(order, data);
      } else {
        await handleFailedPayment(order, data);
      }
      break;

    case 'charge.failed':
      await handleFailedPayment(order, data);
      break;

    case 'transfer.success':
      // Handle refund success if applicable
      console.log('Transfer success event received:', data);
      break;

    case 'transfer.failed':
      // Handle refund failure if applicable
      console.log('Transfer failed event received:', data);
      break;

    case 'transfer.reversed':
      // Handle transfer reversal if applicable
      console.log('Transfer reversed event received:', data);
      break;

    default:
      console.log(`Unhandled webhook event: ${event}`);
  }
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(order: any, paymentData: any) {
  // Only update if not already paid
  if (order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.paidAt = paymentData.paid_at ? new Date(paymentData.paid_at) : new Date();
    order.paystackReference = paymentData.reference;
    
    // Store payment details
    order.paymentDetails = {
      authorizationCode: paymentData.authorization?.authorization_code,
      gatewayResponse: paymentData.gateway_response,
      paidAt: paymentData.paid_at ? new Date(paymentData.paid_at) : new Date(),
      channel: paymentData.channel,
      fees: koboToNaira(paymentData.fees || 0),
    };

    await order.save();
    
    console.log(`Order ${order._id} marked as paid via webhook`);
    
    // TODO: Send order confirmation email
    // TODO: Update inventory
    // TODO: Trigger any post-payment processes
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(order: any, paymentData: any) {
  order.paymentStatus = 'failed';
  order.paystackReference = paymentData.reference;
  
  // Store failure details
  order.paymentDetails = {
    gatewayResponse: paymentData.gateway_response,
    failureReason: paymentData.message,
    failedAt: new Date(),
  };

  await order.save();
  
  console.log(`Order ${order._id} marked as payment failed via webhook`);
  
  // TODO: Send payment failure notification
  // TODO: Release reserved inventory if applicable
}