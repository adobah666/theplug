/**
 * Tests for Paystack Payment Verification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPaymentSuccessful,
  validatePaymentAmount,
  type VerificationResult,
} from '../../../lib/paystack/verify';

describe('Paystack Payment Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPaymentSuccessful', () => {
    it('should return true for successful payment', () => {
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

    it('should return false for failed payment', () => {
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

    it('should return false for abandoned payment', () => {
      const abandonedResult: VerificationResult = {
        success: true,
        reference: 'test_ref',
        amount: 100,
        status: 'abandoned',
        gatewayResponse: 'Abandoned',
        customer: { email: 'test@example.com' },
      };

      expect(isPaymentSuccessful(abandonedResult)).toBe(false);
    });
  });

  describe('validatePaymentAmount', () => {
    const verificationResult: VerificationResult = {
      success: true,
      reference: 'test_ref',
      amount: 100.00,
      status: 'success',
      gatewayResponse: 'Successful',
      customer: { email: 'test@example.com' },
    };

    it('should return true for exact amount match', () => {
      expect(validatePaymentAmount(verificationResult, 100.00)).toBe(true);
    });

    it('should return true for amount within tolerance', () => {
      expect(validatePaymentAmount(verificationResult, 100.005, 0.01)).toBe(true);
    });

    it('should return false for amount outside tolerance', () => {
      expect(validatePaymentAmount(verificationResult, 101.00, 0.01)).toBe(false);
    });

    it('should use default tolerance of 0.01', () => {
      expect(validatePaymentAmount(verificationResult, 100.005)).toBe(true);
      expect(validatePaymentAmount(verificationResult, 100.02)).toBe(false);
    });
  });
});