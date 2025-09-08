/**
 * Integration tests for Paystack utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  nairaToKobo, 
  koboToNaira, 
  validatePaymentData,
  isPaymentSuccessful,
  validatePaymentAmount,
  type PaymentInitializationData,
  type VerificationResult 
} from '../../../lib/paystack';

describe('Paystack Integration Utilities', () => {
  describe('Currency Conversion', () => {
    it('should convert naira to kobo correctly', () => {
      expect(nairaToKobo(100)).toBe(10000);
      expect(nairaToKobo(50.5)).toBe(5050);
      expect(nairaToKobo(0.01)).toBe(1);
    });

    it('should convert kobo to naira correctly', () => {
      expect(koboToNaira(10000)).toBe(100);
      expect(koboToNaira(5050)).toBe(50.5);
      expect(koboToNaira(1)).toBe(0.01);
    });
  });

  describe('Payment Data Validation', () => {
    const validData: PaymentInitializationData = {
      email: 'test@example.com',
      amount: 10000,
      orderId: 'order_123',
      userId: 'user_123',
    };

    it('should validate correct payment data', () => {
      const errors = validatePaymentData(validData);
      expect(errors).toHaveLength(0);
    });

    it('should catch invalid email', () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('Valid email is required');
    });

    it('should catch invalid amount', () => {
      const invalidData = { ...validData, amount: 0 };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('Amount must be greater than 0');
    });
  });

  describe('Payment Verification', () => {
    it('should identify successful payments', () => {
      const successResult: VerificationResult = {
        success: true,
        reference: 'test_ref',
        amount: 100,
        status: 'success',
        gatewayResponse: 'Successful',
        customer: { email: 'test@example.com' },
      };

      expect(isPaymentSuccessful(successResult)).toBe(true);
    });

    it('should identify failed payments', () => {
      const failedResult: VerificationResult = {
        success: false,
        reference: 'test_ref',
        amount: 100,
        status: 'failed',
        gatewayResponse: 'Declined',
        customer: { email: 'test@example.com' },
      };

      expect(isPaymentSuccessful(failedResult)).toBe(false);
    });

    it('should validate payment amounts', () => {
      const verificationResult: VerificationResult = {
        success: true,
        reference: 'test_ref',
        amount: 100.00,
        status: 'success',
        gatewayResponse: 'Successful',
        customer: { email: 'test@example.com' },
      };

      expect(validatePaymentAmount(verificationResult, 100.00)).toBe(true);
      expect(validatePaymentAmount(verificationResult, 101.00, 0.01)).toBe(false);
    });
  });
});