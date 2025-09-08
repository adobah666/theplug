/**
 * Paystack Integration Module
 * Main entry point for all Paystack-related functionality
 */

// Configuration
export { paystack, paystackConfig, type PaystackConfig } from './config';

// Payment initialization
export {
  initializePayment,
  nairaToKobo,
  koboToNaira,
  validatePaymentData,
  type PaymentInitializationData,
  type PaystackInitializeResponse,
} from './initialize';

// Payment verification
export {
  verifyPayment,
  getTransactionDetails,
  isPaymentSuccessful,
  validatePaymentAmount,
  type PaystackVerificationResponse,
  type VerificationResult,
} from './verify';

// Webhook handling
export {
  verifyWebhookSignature,
  parseWebhookPayload,
  extractOrderInfo,
  validateWebhookEvent,
  isPaymentSuccessEvent,
  isPaymentFailureEvent,
  SUPPORTED_WEBHOOK_EVENTS,
  type PaystackWebhookEvent,
  type SupportedWebhookEvent,
} from './webhook';