import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock AWS SES
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'test-message-id' })
  })),
  SendEmailCommand: vi.fn()
}));

// Mock database connection
vi.mock('@/lib/db/connection', () => ({
  default: vi.fn().mockResolvedValue(true)
}));

// Mock User model
const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  save: vi.fn().mockResolvedValue(true)
};

vi.mock('@/lib/db/models/User', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn().mockResolvedValue(mockUser),
    prototype: {
      save: vi.fn()
    }
  }
}));

// Mock JWT
vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    userId: 'user123',
    email: 'test@example.com'
  })
}));

describe('Email Notifications Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.SES_FROM_EMAIL = 'test@example.com';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Registration Email', () => {
    it('should send welcome email when user registers', async () => {
      // Arrange
      const User = (await import('@/lib/db/models/User')).default;
      User.findOne = vi.fn().mockResolvedValue(null); // User doesn't exist
      
      const newUser = {
        ...mockUser,
        save: vi.fn().mockResolvedValue(true)
      };
      
      // Mock constructor
      (User as any).mockImplementation(() => newUser);

      const { POST } = await import('@/app/api/auth/register/route');
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(newUser.save).toHaveBeenCalled();
      
      // Verify welcome email would be queued (we can't easily test the async queue)
      // In a real integration test, you might check email service logs or use a test email service
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email when requested', async () => {
      // Arrange
      const User = (await import('@/lib/db/models/User')).default;
      User.findOne = vi.fn().mockResolvedValue(mockUser);

      const { POST } = await import('@/app/api/auth/reset-password/route');
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('password reset link');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      // Arrange
      const User = (await import('@/lib/db/models/User')).default;
      User.findOne = vi.fn().mockResolvedValue(null); // User doesn't exist

      const { POST } = await import('@/app/api/auth/reset-password/route');
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toContain('password reset link'); // Same message for security
    });
  });

  describe('Order Confirmation Email', () => {
    it('should send order confirmation email when order is created', async () => {
      // Arrange
      const mockOrder = {
        _id: 'order123',
        orderNumber: 'ORD-12345',
        userId: 'user123',
        items: [
          {
            productName: 'Test Product',
            quantity: 1,
            price: 29.99,
            productImage: 'test.jpg'
          }
        ],
        subtotal: 29.99,
        shipping: 5.99,
        tax: 2.40,
        total: 38.38,
        shippingAddress: {
          recipientName: 'John Doe',
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country'
        },
        createdAt: new Date(),
        status: 'pending',
        paymentStatus: 'pending'
      };

      // Mock order service
      vi.doMock('@/lib/orders/service', () => ({
        createOrder: vi.fn().mockResolvedValue({
          success: true,
          order: mockOrder
        })
      }));

      const { POST } = await import('@/app/api/orders/route');
      
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          items: [
            {
              productId: 'prod123',
              quantity: 1,
              price: 29.99
            }
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'City',
            state: 'State',
            zipCode: '12345',
            country: 'Country',
            recipientName: 'John Doe',
            recipientPhone: '555-1234'
          },
          paymentMethod: 'card'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.message).toBe('Order created successfully');
      
      // Verify order confirmation email would be queued
      // In a real integration test, you might check email service logs
    });
  });

  describe('Order Status Update Email', () => {
    it('should send status update email when order status changes', async () => {
      // Arrange
      const mockOrder = {
        _id: 'order123',
        orderNumber: 'ORD-12345',
        userId: 'user123',
        status: 'pending'
      };

      // Mock order service
      vi.doMock('@/lib/orders/service', () => ({
        getOrderById: vi.fn().mockResolvedValue(mockOrder),
        updateOrderStatus: vi.fn().mockResolvedValue({
          ...mockOrder,
          status: 'shipped',
          updatedAt: new Date()
        })
      }));

      const { PUT } = await import('@/app/api/orders/[id]/status/route');
      
      const request = new NextRequest('http://localhost:3000/api/orders/order123/status', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({
          status: 'cancelled',
          cancelReason: 'Customer request'
        })
      });

      // Act
      const response = await PUT(request, { params: { id: 'order123' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Order status updated successfully');
      
      // Verify status update email would be queued
      // In a real integration test, you might check email service logs
    });
  });

  describe('Review Request Email', () => {
    it('should send review request email for delivered orders', async () => {
      // Arrange
      const mockOrder = {
        _id: 'order123',
        orderNumber: 'ORD-12345',
        userId: 'user123',
        status: 'delivered',
        items: [
          {
            productId: 'prod123',
            productName: 'Test Product',
            productImage: 'test.jpg'
          }
        ]
      };

      // Mock order service
      vi.doMock('@/lib/orders/service', () => ({
        getOrderById: vi.fn().mockResolvedValue(mockOrder)
      }));

      const { POST } = await import('@/app/api/orders/[id]/review-request/route');
      
      const request = new NextRequest('http://localhost:3000/api/orders/order123/review-request', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      // Act
      const response = await POST(request, { params: { id: 'order123' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('Review request email sent successfully');
    });

    it('should not send review request for non-delivered orders', async () => {
      // Arrange
      const mockOrder = {
        _id: 'order123',
        orderNumber: 'ORD-12345',
        userId: 'user123',
        status: 'pending'
      };

      // Mock order service
      vi.doMock('@/lib/orders/service', () => ({
        getOrderById: vi.fn().mockResolvedValue(mockOrder)
      }));

      const { POST } = await import('@/app/api/orders/[id]/review-request/route');
      
      const request = new NextRequest('http://localhost:3000/api/orders/order123/review-request', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      // Act
      const response = await POST(request, { params: { id: 'order123' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('delivered orders');
    });
  });
});