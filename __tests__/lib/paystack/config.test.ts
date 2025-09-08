/**
 * Tests for Paystack Configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Paystack Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear all module caches
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should throw error when PAYSTACK_SECRET_KEY is missing', async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_test_123';

    await expect(async () => {
      await import('../../../lib/paystack/config');
    }).rejects.toThrow('PAYSTACK_SECRET_KEY environment variable is required');
  });

  it('should throw error when PAYSTACK_PUBLIC_KEY is missing', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    delete process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    await expect(async () => {
      await import('../../../lib/paystack/config');
    }).rejects.toThrow('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variable is required');
  });

  it('should initialize successfully with valid environment variables', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_test_123';
    process.env.NODE_ENV = 'development';

    const { paystackConfig } = await import('../../../lib/paystack/config');

    expect(paystackConfig.secretKey).toBe('sk_test_123');
    expect(paystackConfig.publicKey).toBe('pk_test_123');
    expect(paystackConfig.baseUrl).toBe('https://api.paystack.co');
  });

  it('should use production URL in production environment', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_123';
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = 'pk_live_123';
    process.env.NODE_ENV = 'production';

    const { paystackConfig } = await import('../../../lib/paystack/config');

    expect(paystackConfig.baseUrl).toBe('https://api.paystack.co');
  });
});