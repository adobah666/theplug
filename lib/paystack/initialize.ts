/**
 * Paystack Payment Initialization Utilities
 * Handles payment initialization and transaction setup
 */

import { paystack } from './config';

export interface PaymentInitializationData {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  orderId: string;
  userId: string;
  metadata?: Record<string, any>;
  callback_url?: string;
  channels?: string[];
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Initialize a payment transaction with Paystack
 */
export async function initializePayment(
  data: PaymentInitializationData
): Promise<PaystackInitializeResponse> {
  try {
    // Generate unique reference
    const reference = `order_${data.orderId}_${Date.now()}`;
    
    // Prepare initialization payload
    const initializationPayload = {
      email: data.email,
      amount: Math.round(data.amount), // Ensure amount is integer (kobo)
      reference,
      callback_url: data.callback_url || `${process.env.NEXTAUTH_URL}/checkout/callback`,
      metadata: {
        orderId: data.orderId,
        userId: data.userId,
        ...data.metadata,
      },
      channels: data.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
    };

    // Initialize payment with Paystack
    const response = await paystack.transaction.initialize(initializationPayload);
    
    if (!response.status) {
      throw new Error(response.message || 'Failed to initialize payment');
    }

    return response;
  } catch (error) {
    console.error('Payment initialization error:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to initialize payment with Paystack'
    );
  }
}

/**
 * Convert amount from naira to kobo (Paystack expects kobo)
 */
export function nairaToKobo(nairaAmount: number): number {
  return Math.round(nairaAmount * 100);
}

/**
 * Convert amount from kobo to naira
 */
export function koboToNaira(koboAmount: number): number {
  return koboAmount / 100;
}

/**
 * Validate payment initialization data
 */
export function validatePaymentData(data: PaymentInitializationData): string[] {
  const errors: string[] = [];

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!data.orderId || data.orderId.trim().length === 0) {
    errors.push('Order ID is required');
  }

  if (!data.userId || data.userId.trim().length === 0) {
    errors.push('User ID is required');
  }

  return errors;
}