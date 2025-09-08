/**
 * Tests for Paystack Webhook Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  extractOrderInfo,
  validateWebhookEvent,
  isPaymentSuccessEvent,
  isPaymentFailureEvent,
  type PaystackWebhookEvent,
} from '../../../lib/paystack/webhook';

// Mock the paystack config
vi.mock('../../../lib/paystack/config', () => ({
  paystackConfig: {
    webhookSecret: '',
  },
}));

describe('Paystack Webhook Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWebhookEvent: PaystackWebhookEvent = {
    event: 'charge.success',
    data: {
      id: 123456,
      domain: 'test',
      status: 'success',
      reference: 'test_ref_123',
      amount: 1000000, // 10,000 naira in kobo
      message: null,
      gateway_response: 'Successful',
      paid_at: '2023-01-01T12:00:00.000Z',
      created_at: '2023-01-01T11:00:00.000Z',
      channel: 'card',
      currency: 'NGN',
      ip_address: '127.0.0.1',
      metadata: {
        orderId: 'order_123',
        userId: 'user_123',
      },
      fees: 15000,
      customer: {
        id: 789,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        customer_code: 'CUS_123',
        phone: '+2348012345678',
      },
      authorization: {
        authorization_code: 'AUTH_123',
        bin: '408408',
        last4: '4081',
        exp_month: '12',
        exp_year: '2030',
        channel: 'card',
        card_type: 'visa',
        bank: 'TEST BANK',
        country_code: 'NG',
        brand: 'visa',
        reusable: true,
      },
      plan: null,
      subaccount: null,
      split: null,
      order_id: null,
      paidAt: '2023-01-01T12:00:00.000Z',
      pos_transaction_data: null,
      source: null,
    },
  };

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const secret = 'test_webhook_secret';
      const signature = crypto
        .createHmac('sha512', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const invalidSignature = 'invalid_signature';

      const isValid = verifyWebhookSignature(payload, invalidSignature, 'test_webhook_secret');
      expect(isValid).toBe(false);
    });

    it('should handle missing webhook secret gracefully', () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const signature = 'any_signature';

      const isValid = verifyWebhookSignature(payload, signature, '');
      expect(isValid).toBe(true); // Should allow in development
    });

    it('should handle Buffer payload', () => {
      const payload = Buffer.from(JSON.stringify(mockWebhookEvent));
      const secret = 'test_webhook_secret';
      const signature = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should handle crypto errors gracefully', () => {
      // Mock crypto to throw an error
      const originalCreateHmac = crypto.createHmac;
      vi.spyOn(crypto, 'createHmac').mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const payload = JSON.stringify(mockWebhookEvent);
      const isValid = verifyWebhookSignature(payload, 'signature', 'secret');
      
      expect(isValid).toBe(false);
      
      // Restore original function
      crypto.createHmac = originalCreateHmac;
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid webhook payload', () => {
      const payload = JSON.stringify(mockWebhookEvent);
      const parsed = parseWebhookPayload(payload);

      expect(parsed).toEqual(mockWebhookEvent);
    });

    it('should return null for invalid JSON', () => {
      const invalidPayload = 'invalid json';
      const parsed = parseWebhookPayload(invalidPayload);

      expect(parsed).toBeNull();
    });

    it('should return null for payload without event', () => {
      const invalidEvent = { data: mockWebhookEvent.data };
      const payload = JSON.stringify(invalidEvent);
      const parsed = parseWebhookPayload(payload);

      expect(parsed).toBeNull();
    });

    it('should return null for payload without data', () => {
      const invalidEvent = { event: 'charge.success' };
      const payload = JSON.stringify(invalidEvent);
      const parsed = parseWebhookPayload(payload);

      expect(parsed).toBeNull();
    });
  });

  describe('extractOrderInfo', () => {
    it('should extract order information correctly', () => {
      const orderInfo = extractOrderInfo(mockWebhookEvent);

      expect(orderInfo).toEqual({
        orderId: 'order_123',
        userId: 'user_123',
        reference: 'test_ref_123',
        amount: 10000, // Converted from kobo to naira
        status: 'success',
      });
    });

    it('should handle missing metadata', () => {
      const eventWithoutMetadata = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          metadata: {},
        },
      };

      const orderInfo = extractOrderInfo(eventWithoutMetadata);

      expect(orderInfo.orderId).toBeUndefined();
      expect(orderInfo.userId).toBeUndefined();
      expect(orderInfo.reference).toBe('test_ref_123');
    });
  });

  describe('validateWebhookEvent', () => {
    it('should return no errors for valid event', () => {
      const errors = validateWebhookEvent(mockWebhookEvent);
      expect(errors).toHaveLength(0);
    });

    it('should validate event type', () => {
      const invalidEvent = {
        ...mockWebhookEvent,
        event: '',
      };

      const errors = validateWebhookEvent(invalidEvent);
      expect(errors).toContain('Event type is required');
    });

    it('should validate event data exists', () => {
      const invalidEvent = {
        event: 'charge.success',
        data: null as any,
      };

      const errors = validateWebhookEvent(invalidEvent);
      expect(errors).toContain('Event data is required');
    });

    it('should validate transaction reference', () => {
      const invalidEvent = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          reference: '',
        },
      };

      const errors = validateWebhookEvent(invalidEvent);
      expect(errors).toContain('Transaction reference is required');
    });

    it('should validate amount', () => {
      const invalidEvent = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          amount: 0,
        },
      };

      const errors = validateWebhookEvent(invalidEvent);
      expect(errors).toContain('Valid amount is required');
    });

    it('should validate status', () => {
      const invalidEvent = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          status: '',
        },
      };

      const errors = validateWebhookEvent(invalidEvent);
      expect(errors).toContain('Transaction status is required');
    });
  });

  describe('isPaymentSuccessEvent', () => {
    it('should return true for successful charge event', () => {
      expect(isPaymentSuccessEvent(mockWebhookEvent)).toBe(true);
    });

    it('should return false for failed charge event', () => {
      const failedEvent = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          status: 'failed',
        },
      };

      expect(isPaymentSuccessEvent(failedEvent)).toBe(false);
    });

    it('should return false for different event type', () => {
      const transferEvent = {
        ...mockWebhookEvent,
        event: 'transfer.success',
      };

      expect(isPaymentSuccessEvent(transferEvent)).toBe(false);
    });
  });

  describe('isPaymentFailureEvent', () => {
    it('should return true for charge.failed event', () => {
      const failedEvent = {
        ...mockWebhookEvent,
        event: 'charge.failed',
      };

      expect(isPaymentFailureEvent(failedEvent)).toBe(true);
    });

    it('should return true for charge.success with failed status', () => {
      const failedEvent = {
        ...mockWebhookEvent,
        data: {
          ...mockWebhookEvent.data,
          status: 'failed',
        },
      };

      expect(isPaymentFailureEvent(failedEvent)).toBe(true);
    });

    it('should return false for successful charge event', () => {
      expect(isPaymentFailureEvent(mockWebhookEvent)).toBe(false);
    });
  });
});