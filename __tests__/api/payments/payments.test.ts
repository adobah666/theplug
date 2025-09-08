/**
 * Integration tests for Payment API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import connectDB from '../../../lib/db/connection';
import User from '../../../lib/db/models/User';
import Order from '../../../lib/db/models/Order';
import Product from '../../../lib/db/models/Product';
import { generateToken } from '../../../lib/auth/jwt';

// Mock Paystack functions
vi.mock('../../../lib/paystack', () => ({
  initializePayment: vi.fn(),
  verifyPayment: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  parseWebhookPayload: vi.fn(),
  extractOrderInfo: vi.fn(),
  validateWebhookEvent: vi.fn(),
  isPaymentSuccessEvent: vi.fn(),
  isPaymentFailureEvent: vi.fn(),
  nairaToKobo: (amount: number) => amount * 100,
  koboToNaira: (amount: number) => amount / 100,
  validatePaymentData: vi.fn().mockReturnValue([]),
}));

describe('Payment API Integration Tests', () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;
  let authToken: string;

  beforeEach(async () => {
    await connectDB();
    
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      phone: '+2348012345678',
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      description: 'Test product description',
      price: 10000,
      images: ['test-image.jpg'],
      category: 'clothing',
      brand: 'Test Brand',
      inventory: 10,
    });

    // Create test order
    testOrder = await Order.create({
      userId: testUser._id,
      items: [{
        productId: testProduct._id,
        quantity: 2,
        price: testProduct.price,
        name: testProduct.name,
      }],
      subtotal: 20000,
      tax: 0,
      shipping: 0,
      total: 20000,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: {
        street: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        zipCode: '100001',
        country: 'Nigeria',
      },
    });

    // Generate auth token
    authToken = generateToken({ id: testUser._id.toString(), email: testUser.email });
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    vi.clearAllMocks();
  });

  describe('POST /api/payments/initialize', () => {
    it('should initialize payment successfully', async () => {
      const { initializePayment } = await import('../../../lib/paystack');
      
      vi.mocked(initializePayment).mockResolvedValue({
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/test123',
          access_code: 'test_access_code',
          reference: 'test_reference_123',
        },
      });

      const response = await fetch('http://localhost:3000/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: testOrder._id.toString(),
          callbackUrl: 'http://localhost:3000/checkout/callback',
        }),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.authorizationUrl).toBe('https://checkout.paystack.com/test123');
      expect(result.data.reference).toBe('test_reference_123');

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder?.paystackReference).toBe('test_reference_123');
      expect(updatedOrder?.paymentStatus).toBe('pending');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch('http://localhost:3000/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: testOrder._id.toString(),
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await fetch('http://localhost:3000/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: '507f1f77bcf86cd799439011', // Non-existent order ID
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for already paid order', async () => {
      // Mark order as paid
      testOrder.paymentStatus = 'paid';
      await testOrder.save();

      const response = await fetch('http://localhost:3000/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId: testOrder._id.toString(),
        }),
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('Order is already paid');
    });
  });

  describe('POST /api/payments/verify', () => {
    beforeEach(async () => {
      // Set up order with Paystack reference
      testOrder.paystackReference = 'test_reference_123';
      await testOrder.save();
    });

    it('should verify successful payment', async () => {
      const { verifyPayment, isPaymentSuccessful, validatePaymentAmount } = await import('../../../lib/paystack');
      
      vi.mocked(verifyPayment).mockResolvedValue({
        success: true,
        reference: 'test_reference_123',
        amount: 20000,
        orderId: testOrder._id.toString(),
        userId: testUser._id.toString(),
        status: 'success',
        paidAt: new Date(),
        gatewayResponse: 'Successful',
        authorizationCode: 'AUTH_123',
        customer: { email: testUser.email },
      });

      vi.mocked(isPaymentSuccessful).mockReturnValue(true);
      vi.mocked(validatePaymentAmount).mockReturnValue(true);

      const response = await fetch('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: 'test_reference_123',
          orderId: testOrder._id.toString(),
        }),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment verified successfully');

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder?.paymentStatus).toBe('paid');
      expect(updatedOrder?.status).toBe('confirmed');
    });

    it('should handle failed payment verification', async () => {
      const { verifyPayment, isPaymentSuccessful } = await import('../../../lib/paystack');
      
      vi.mocked(verifyPayment).mockResolvedValue({
        success: true,
        reference: 'test_reference_123',
        amount: 20000,
        status: 'failed',
        gatewayResponse: 'Declined by bank',
        customer: { email: testUser.email },
      });

      vi.mocked(isPaymentSuccessful).mockReturnValue(false);

      const response = await fetch('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: 'test_reference_123',
        }),
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Payment verification failed');

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder?.paymentStatus).toBe('failed');
    });

    it('should return 400 for amount mismatch', async () => {
      const { verifyPayment, isPaymentSuccessful, validatePaymentAmount } = await import('../../../lib/paystack');
      
      vi.mocked(verifyPayment).mockResolvedValue({
        success: true,
        reference: 'test_reference_123',
        amount: 15000, // Different amount
        status: 'success',
        gatewayResponse: 'Successful',
        customer: { email: testUser.email },
      });

      vi.mocked(isPaymentSuccessful).mockReturnValue(true);
      vi.mocked(validatePaymentAmount).mockReturnValue(false);

      const response = await fetch('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: 'test_reference_123',
        }),
      });

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('Payment amount does not match order total');
    });
  });

  describe('POST /api/payments/webhook', () => {
    const mockWebhookPayload = {
      event: 'charge.success',
      data: {
        id: 123456,
        reference: 'test_reference_123',
        amount: 2000000, // 20,000 naira in kobo
        status: 'success',
        gateway_response: 'Successful',
        paid_at: '2023-01-01T12:00:00.000Z',
        channel: 'card',
        fees: 29000,
        authorization: {
          authorization_code: 'AUTH_123',
        },
        metadata: {
          orderId: '',
        },
      },
    };

    beforeEach(async () => {
      // Set up order with Paystack reference
      testOrder.paystackReference = 'test_reference_123';
      await testOrder.save();
      
      // Update mock payload with actual order ID
      mockWebhookPayload.data.metadata.orderId = testOrder._id.toString();
    });

    it('should process successful payment webhook', async () => {
      const { 
        verifyWebhookSignature, 
        parseWebhookPayload, 
        extractOrderInfo, 
        validateWebhookEvent 
      } = await import('../../../lib/paystack');
      
      vi.mocked(verifyWebhookSignature).mockReturnValue(true);
      vi.mocked(parseWebhookPayload).mockReturnValue(mockWebhookPayload as any);
      vi.mocked(extractOrderInfo).mockReturnValue({
        orderId: testOrder._id.toString(),
        reference: 'test_reference_123',
        amount: 20000,
        status: 'success',
      });
      vi.mocked(validateWebhookEvent).mockReturnValue([]);

      const response = await fetch('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': 'valid_signature',
        },
        body: JSON.stringify(mockWebhookPayload),
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder?.paymentStatus).toBe('paid');
      expect(updatedOrder?.status).toBe('confirmed');
    });

    it('should return 401 for invalid signature', async () => {
      const { verifyWebhookSignature } = await import('../../../lib/paystack');
      
      vi.mocked(verifyWebhookSignature).mockReturnValue(false);

      const response = await fetch('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': 'invalid_signature',
        },
        body: JSON.stringify(mockWebhookPayload),
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing signature', async () => {
      const response = await fetch('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookPayload),
      });

      expect(response.status).toBe(400);
    });
  });
});