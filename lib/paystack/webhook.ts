/**
 * Paystack Webhook Utilities
 * Handles webhook signature verification and event processing
 */

import crypto from 'crypto';
import { paystackConfig } from './config';

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      orderId?: string;
      userId?: string;
      [key: string]: any;
    };
    fees: number;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
    };
    plan: any;
    subaccount: any;
    split: any;
    order_id: any;
    paidAt: string | null;
    pos_transaction_data: any;
    source: any;
  };
}

/**
 * Verify Paystack webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret?: string
): boolean {
  try {
    const webhookSecret = secret || paystackConfig.webhookSecret;
    
    if (!webhookSecret || webhookSecret.trim().length === 0) {
      console.warn('Webhook secret not configured - skipping signature verification');
      return true; // Allow in development if no secret is set
    }

    // Create hash using the webhook secret
    const data = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(data)
      .digest('hex');

    // Compare signatures
    return hash === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Parse webhook payload safely
 */
export function parseWebhookPayload(payload: string): PaystackWebhookEvent | null {
  try {
    const event = JSON.parse(payload) as PaystackWebhookEvent;
    
    // Basic validation
    if (!event.event || !event.data) {
      throw new Error('Invalid webhook payload structure');
    }

    return event;
  } catch (error) {
    console.error('Webhook payload parsing error:', error);
    return null;
  }
}

/**
 * Extract order information from webhook event
 */
export function extractOrderInfo(event: PaystackWebhookEvent): {
  orderId?: string;
  userId?: string;
  reference: string;
  amount: number;
  status: string;
} {
  return {
    orderId: event.data.metadata?.orderId,
    userId: event.data.metadata?.userId,
    reference: event.data.reference,
    amount: event.data.amount / 100, // Convert from kobo to naira
    status: event.data.status,
  };
}

/**
 * Validate webhook event data
 */
export function validateWebhookEvent(event: PaystackWebhookEvent): string[] {
  const errors: string[] = [];

  if (!event.event) {
    errors.push('Event type is required');
  }

  if (!event.data) {
    errors.push('Event data is required');
  } else {
    if (!event.data.reference) {
      errors.push('Transaction reference is required');
    }

    if (typeof event.data.amount !== 'number' || event.data.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!event.data.status) {
      errors.push('Transaction status is required');
    }
  }

  return errors;
}

/**
 * Check if webhook event is a payment success event
 */
export function isPaymentSuccessEvent(event: PaystackWebhookEvent): boolean {
  return event.event === 'charge.success' && event.data.status === 'success';
}

/**
 * Check if webhook event is a payment failure event
 */
export function isPaymentFailureEvent(event: PaystackWebhookEvent): boolean {
  return event.event === 'charge.failed' || 
         (event.event === 'charge.success' && event.data.status === 'failed');
}

/**
 * Get supported webhook events
 */
export const SUPPORTED_WEBHOOK_EVENTS = [
  'charge.success',
  'charge.failed',
  'transfer.success',
  'transfer.failed',
  'transfer.reversed',
] as const;

export type SupportedWebhookEvent = typeof SUPPORTED_WEBHOOK_EVENTS[number];