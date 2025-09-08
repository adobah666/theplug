/**
 * Paystack Configuration
 * Handles Paystack SDK initialization and configuration
 */

const Paystack = require('paystack');

// Validate required environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
}

if (!PAYSTACK_PUBLIC_KEY) {
  throw new Error('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variable is required');
}

// Initialize Paystack instance
export const paystack = Paystack(PAYSTACK_SECRET_KEY);

// Export configuration
export const paystackConfig = {
  secretKey: PAYSTACK_SECRET_KEY,
  publicKey: PAYSTACK_PUBLIC_KEY,
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.paystack.co' 
    : 'https://api.paystack.co', // Paystack uses same URL for test and live
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
} as const;

// Export types
export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
  webhookSecret: string;
}