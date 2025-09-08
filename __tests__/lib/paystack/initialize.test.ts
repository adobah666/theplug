/**
 * Tests for Paystack Payment Initialization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializePayment,
  nairaToKobo,
  koboToNaira,
  validatePaymentData,
  type PaymentInitializationData,
} from '../../../lib/paystack/initialize';

// Mock the paystack config
vi.mock('../../../lib/paystack/config', () => ({
  paystack: {
    transaction: {
      initialize: vi.fn(),
    },
  },
}));

describe('Paystack Payment Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('nairaToKobo', () => {
    it('should convert naira to kobo correctly', () => {
      expect(nairaToKobo(100)).toBe(10000);
      expect(nairaToKobo(50.5)).toBe(5050);
      expect(nairaToKobo(0.01)).toBe(1);
    });

    it('should round to nearest kobo', () => {
      expect(nairaToKobo(100.005)).toBe(10001);
      expect(nairaToKobo(100.004)).toBe(10000);
    });
  });

  describe('koboToNaira', () => {
    it('should convert kobo to naira correctly', () => {
      expect(koboToNaira(10000)).toBe(100);
      expect(koboToNaira(5050)).toBe(50.5);
      expect(koboToNaira(1)).toBe(0.01);
    });
  });

  describe('validatePaymentData', () => {
    const validData: PaymentInitializationData = {
      email: 'test@example.com',
      amount: 10000,
      orderId: 'order_123',
      userId: 'user_123',
    };

    it('should return no errors for valid data', () => {
      const errors = validatePaymentData(validData);
      expect(errors).toHaveLength(0);
    });

    it('should validate email format', () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('Valid email is required');
    });

    it('should validate amount is positive', () => {
      const invalidData = { ...validData, amount: 0 };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('Amount must be greater than 0');
    });

    it('should validate orderId is provided', () => {
      const invalidData = { ...validData, orderId: '' };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('Order ID is required');
    });

    it('should validate userId is provided', () => {
      const invalidData = { ...validData, userId: '' };
      const errors = validatePaymentData(invalidData);
      expect(errors).toContain('User ID is required');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        email: 'invalid',
        amount: -100,
        orderId: '',
        userId: '',
      };
      const errors = validatePaymentData(invalidData);
      expect(errors).toHaveLength(4);
    });
  });

  describe('initializePayment', () => {
    const validData: PaymentInitializationData = {
      email: 'test@example.com',
      amount: 10000,
      orderId: 'order_123',
      userId: 'user_123',
    };

    it('should initialize payment successfully', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/test123',
          access_code: 'test_access_code',
          reference: 'test_reference',
        },
      };

      const { paystack } = await import('../../../lib/paystack/config');
      vi.mocked(paystack.transaction.initialize).mockResolvedValue(mockResponse);

      const result = await initializePayment(validData);

      expect(result).toEqual(mockResponse);
      expect(paystack.transaction.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validData.email,
          amount: validData.amount,
          reference: expect.stringMatching(/^order_order_123_\d+$/),
          metadata: expect.objectContaining({
            orderId: validData.orderId,
            userId: validData.userId,
          }),
        })
      );
    });

    it('should include custom metadata', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/test123',
          access_code: 'test_access_code',
          reference: 'test_reference',
        },
      };

      const { paystack } = await import('../../../lib/paystack/config');
      vi.mocked(paystack.transaction.initialize).mockResolvedValue(mockResponse);

      const dataWithMetadata = {
        ...validData,
        metadata: { customField: 'customValue' },
      };

      await initializePayment(dataWithMetadata);

      expect(paystack.transaction.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            orderId: validData.orderId,
            userId: validData.userId,
            customField: 'customValue',
          }),
        })
      );
    });

    it('should handle Paystack API errors', async () => {
      const { paystack } = await import('../../../lib/paystack/config');
      const mockError = new Error('Paystack API error');
      vi.mocked(paystack.transaction.initialize).mockRejectedValue(mockError);

      await expect(initializePayment(validData)).rejects.toThrow('Paystack API error');
    });

    it('should handle Paystack response errors', async () => {
      const { paystack } = await import('../../../lib/paystack/config');
      const mockResponse = {
        status: false,
        message: 'Invalid email address',
      };

      vi.mocked(paystack.transaction.initialize).mockResolvedValue(mockResponse);

      await expect(initializePayment(validData)).rejects.toThrow('Invalid email address');
    });

    it('should round amount to integer', async () => {
      const mockResponse = {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/test123',
          access_code: 'test_access_code',
          reference: 'test_reference',
        },
      };

      const { paystack } = await import('../../../lib/paystack/config');
      vi.mocked(paystack.transaction.initialize).mockResolvedValue(mockResponse);

      const dataWithDecimal = { ...validData, amount: 10000.7 };
      await initializePayment(dataWithDecimal);

      expect(paystack.transaction.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10001, // Rounded up
        })
      );
    });
  });
});