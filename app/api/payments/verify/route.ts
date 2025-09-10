/**
 * Payment Verification API Route
 * POST /api/payments/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Order from '@/lib/db/models/Order';
import Cart from '@/lib/db/models/Cart';
import Product from '@/lib/db/models/Product';
import ProductEvent from '@/lib/db/models/ProductEvent';
import { reserveInventory } from '@/lib/orders/service';
import { authenticateToken } from '@/lib/auth/middleware';
import { 
  verifyPayment, 
  isPaymentSuccessful, 
  validatePaymentAmount,
  koboToNaira 
} from '@/lib/paystack';

interface PaymentVerifyRequest {
  reference: string;
  orderId?: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { reference, orderId }: PaymentVerifyRequest = await request.json();

    // Validate request
    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const verificationResult = await verifyPayment(reference);

    if (!verificationResult.success) {
      return NextResponse.json({
        success: false,
        error: verificationResult.error || 'Payment verification failed',
        status: verificationResult.status,
      }, { status: 400 });
    }

    // Find the order using reference or orderId
    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (verificationResult.orderId) {
      order = await Order.findById(verificationResult.orderId);
    } else {
      order = await Order.findOne({ paystackReference: reference });
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found for this payment' },
        { status: 404 }
      );
    }

    // Verify payment amount matches order total
    const isAmountValid = validatePaymentAmount(verificationResult, order.total);
    if (!isAmountValid) {
      console.error('Payment amount mismatch:', {
        expected: order.total,
        received: verificationResult.amount,
        reference,
      });
      
      return NextResponse.json({
        success: false,
        error: 'Payment amount does not match order total',
        expected: order.total,
        received: verificationResult.amount,
      }, { status: 400 });
    }

    // Check if payment was successful
    if (isPaymentSuccessful(verificationResult)) {
      // Reserve inventory now that payment is confirmed
      try {
        await reserveInventory(order.items as any, null) // no transaction session here
      } catch (inventoryError) {
        console.error('Failed to reserve inventory after payment:', inventoryError)
        // Continue with order update but log the issue
      }

      // Update order status
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.paidAt = verificationResult.paidAt || new Date();
      order.paystackReference = reference;
      
      // Store payment details
      if (verificationResult.authorizationCode) {
        order.paymentDetails = {
          authorizationCode: verificationResult.authorizationCode,
          gatewayResponse: verificationResult.gatewayResponse,
          paidAt: verificationResult.paidAt,
        };
      }

      await order.save();

      // Increment analytics for successful purchase
      try {
        if (order.items && order.items.length > 0) {
          const ops = order.items.map((it: any) => ({
            updateOne: {
              filter: { _id: it.productId },
              update: { $inc: { purchaseCount: it.quantity, popularityScore: 5 * it.quantity } }
            }
          }))
          if (ops.length > 0) {
            await Product.bulkWrite(ops)
          }
          // Log ProductEvent per item
          try {
            await ProductEvent.insertMany(order.items.map((it: any) => ({
              productId: it.productId,
              type: 'purchase',
              quantity: it.quantity,
              userId: order.userId
            })))
          } catch {}
        }
      } catch (analyticsErr) {
        console.error('Failed to record purchase analytics:', analyticsErr)
      }

      // Clear server-side carts for this user after successful payment
      let sessionIdCookie: string | undefined
      try {
        await Cart.deleteMany({ userId: order.userId })
        // Also clear any guest carts tied to the current sessionId cookie
        sessionIdCookie = request.cookies.get('sessionId')?.value
        if (sessionIdCookie) {
          await Cart.deleteMany({ sessionId: sessionIdCookie })
        }
      } catch (cartErr) {
        console.error('Failed to clear cart(s) after payment:', cartErr)
      }

      const successResponse = NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          amount: order.total,
          paidAt: order.paidAt,
          reference: reference,
        },
      })

      // Expire the guest sessionId cookie if present (prevents stale guest cart rehydration)
      if (sessionIdCookie) {
        successResponse.cookies.set('sessionId', '', { maxAge: 0, httpOnly: true, sameSite: 'lax' })
      }

      return successResponse
    } else {
      // Payment failed
      order.paymentStatus = 'failed';
      order.paystackReference = reference;
      await order.save();

      return NextResponse.json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.gatewayResponse,
        data: {
          orderId: order._id,
          status: verificationResult.status,
          gatewayResponse: verificationResult.gatewayResponse,
        },
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}