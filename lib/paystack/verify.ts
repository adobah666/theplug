/**
 * Paystack Payment Verification Utilities
 * Handles payment verification and transaction status checking
 */

import { paystack } from './config';
import { koboToNaira } from './initialize';

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
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
    log: any;
    fees: number;
    fees_split: any;
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
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: any;
    split: any;
    order_id: any;
    paidAt: string | null;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export interface VerificationResult {
  success: boolean;
  reference: string;
  amount: number; // Amount in naira
  orderId?: string;
  userId?: string;
  status: 'success' | 'failed' | 'abandoned';
  paidAt?: Date;
  gatewayResponse: string;
  authorizationCode?: string;
  customer: {
    email: string;
    phone?: string;
  };
  error?: string;
}

/**
 * Verify a payment transaction with Paystack
 */
export async function verifyPayment(reference: string): Promise<VerificationResult> {
  try {
    if (!reference || reference.trim().length === 0) {
      throw new Error('Payment reference is required');
    }

    // Verify transaction with Paystack
    const response: PaystackVerificationResponse = await paystack.transaction.verify(reference);
    
    if (!response.status) {
      throw new Error(response.message || 'Failed to verify payment');
    }

    const { data } = response;
    
    // Extract verification result
    const result: VerificationResult = {
      success: data.status === 'success',
      reference: data.reference,
      amount: koboToNaira(data.amount),
      orderId: data.metadata?.orderId,
      userId: data.metadata?.userId,
      status: data.status,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      gatewayResponse: data.gateway_response,
      authorizationCode: data.authorization?.authorization_code,
      customer: {
        email: data.customer.email,
        phone: data.customer.phone || undefined,
      },
    };

    return result;
  } catch (error) {
    console.error('Payment verification error:', error);
    
    return {
      success: false,
      reference,
      amount: 0,
      status: 'failed',
      gatewayResponse: 'Verification failed',
      customer: { email: '' },
      error: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}

/**
 * Get transaction details by reference
 */
export async function getTransactionDetails(reference: string): Promise<PaystackVerificationResponse | null> {
  try {
    const response = await paystack.transaction.verify(reference);
    return response.status ? response : null;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

/**
 * Check if a payment was successful
 */
export function isPaymentSuccessful(verificationResult: VerificationResult): boolean {
  return verificationResult.success && verificationResult.status === 'success';
}

/**
 * Validate payment amount against expected amount
 */
export function validatePaymentAmount(
  verificationResult: VerificationResult, 
  expectedAmount: number,
  tolerance: number = 0.01 // Allow 1 kobo tolerance
): boolean {
  const difference = Math.abs(verificationResult.amount - expectedAmount);
  return difference <= tolerance;
}