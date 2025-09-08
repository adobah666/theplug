import { describe, it, expect } from 'vitest';
import { emailTemplates } from '@/lib/email/templates';

describe('Email Templates', () => {
  describe('orderConfirmation', () => {
    it('should generate order confirmation email template', () => {
      // Arrange
      const orderData = {
        customerName: 'John Doe',
        orderNumber: 'ORD-12345',
        orderDate: '2024-01-15',
        items: [
          {
            name: 'Test Product',
            quantity: 2,
            price: 29.99,
            image: 'https://example.com/image.jpg'
          }
        ],
        subtotal: 59.98,
        shipping: 5.99,
        tax: 4.80,
        total: 70.77,
        shippingAddress: {
          name: 'John Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        },
        trackingUrl: 'https://example.com/track/123'
      };

      // Act
      const template = emailTemplates.orderConfirmation(orderData);

      // Assert
      expect(template.subject).toBe('Order Confirmation - ORD-12345');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain('ORD-12345');
      expect(template.html).toContain('Test Product');
      expect(template.html).toContain('$70.77');
      expect(template.text).toContain('John Doe');
      expect(template.text).toContain('ORD-12345');
    });
  });

  describe('passwordReset', () => {
    it('should generate password reset email template', () => {
      // Arrange
      const resetData = {
        customerName: 'Jane Smith',
        resetUrl: 'https://example.com/reset?token=abc123',
        expiresIn: '1 hour'
      };

      // Act
      const template = emailTemplates.passwordReset(resetData);

      // Assert
      expect(template.subject).toBe('Reset Your Password - The Plug Fashion');
      expect(template.html).toContain('Jane Smith');
      expect(template.html).toContain('https://example.com/reset?token=abc123');
      expect(template.html).toContain('1 hour');
      expect(template.text).toContain('Jane Smith');
      expect(template.text).toContain('https://example.com/reset?token=abc123');
    });
  });

  describe('welcome', () => {
    it('should generate welcome email template', () => {
      // Arrange
      const welcomeData = {
        customerName: 'Bob Johnson',
        email: 'bob@example.com',
        loginUrl: 'https://example.com/account'
      };

      // Act
      const template = emailTemplates.welcome(welcomeData);

      // Assert
      expect(template.subject).toBe('Welcome to The Plug Fashion!');
      expect(template.html).toContain('Bob Johnson');
      expect(template.html).toContain('bob@example.com');
      expect(template.html).toContain('https://example.com/account');
      expect(template.text).toContain('Bob Johnson');
      expect(template.text).toContain('bob@example.com');
    });
  });

  describe('orderStatusUpdate', () => {
    it('should generate order status update email template', () => {
      // Arrange
      const statusData = {
        customerName: 'Alice Brown',
        orderNumber: 'ORD-67890',
        status: 'Shipped',
        statusMessage: 'Your order is on its way!',
        trackingUrl: 'https://example.com/track/67890',
        estimatedDelivery: '2024-01-20'
      };

      // Act
      const template = emailTemplates.orderStatusUpdate(statusData);

      // Assert
      expect(template.subject).toBe('Order Update - ORD-67890');
      expect(template.html).toContain('Alice Brown');
      expect(template.html).toContain('ORD-67890');
      expect(template.html).toContain('Shipped');
      expect(template.html).toContain('Your order is on its way!');
      expect(template.html).toContain('2024-01-20');
      expect(template.text).toContain('Alice Brown');
      expect(template.text).toContain('ORD-67890');
    });
  });

  describe('reviewRequest', () => {
    it('should generate review request email template', () => {
      // Arrange
      const reviewData = {
        customerName: 'Charlie Wilson',
        orderNumber: 'ORD-11111',
        items: [
          {
            name: 'Product A',
            image: 'https://example.com/product-a.jpg',
            reviewUrl: 'https://example.com/products/a/review'
          },
          {
            name: 'Product B',
            reviewUrl: 'https://example.com/products/b/review'
          }
        ]
      };

      // Act
      const template = emailTemplates.reviewRequest(reviewData);

      // Assert
      expect(template.subject).toBe('How was your recent order? - ORD-11111');
      expect(template.html).toContain('Charlie Wilson');
      expect(template.html).toContain('ORD-11111');
      expect(template.html).toContain('Product A');
      expect(template.html).toContain('Product B');
      expect(template.html).toContain('https://example.com/products/a/review');
      expect(template.text).toContain('Charlie Wilson');
      expect(template.text).toContain('ORD-11111');
    });
  });

  describe('template content validation', () => {
    it('should include both HTML and text versions for all templates', () => {
      const testData = {
        customerName: 'Test User',
        orderNumber: 'TEST-123',
        orderDate: '2024-01-01',
        items: [],
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        shippingAddress: {
          name: 'Test',
          street: 'Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        },
        resetUrl: 'https://test.com',
        expiresIn: '1 hour',
        email: 'test@test.com',
        loginUrl: 'https://test.com',
        status: 'Test Status',
        statusMessage: 'Test message'
      };

      // Test all templates have required properties
      const orderConfirmation = emailTemplates.orderConfirmation(testData as any);
      expect(orderConfirmation.subject).toBeTruthy();
      expect(orderConfirmation.html).toBeTruthy();
      expect(orderConfirmation.text).toBeTruthy();

      const passwordReset = emailTemplates.passwordReset(testData as any);
      expect(passwordReset.subject).toBeTruthy();
      expect(passwordReset.html).toBeTruthy();
      expect(passwordReset.text).toBeTruthy();

      const welcome = emailTemplates.welcome(testData as any);
      expect(welcome.subject).toBeTruthy();
      expect(welcome.html).toBeTruthy();
      expect(welcome.text).toBeTruthy();

      const orderStatus = emailTemplates.orderStatusUpdate(testData as any);
      expect(orderStatus.subject).toBeTruthy();
      expect(orderStatus.html).toBeTruthy();
      expect(orderStatus.text).toBeTruthy();

      const reviewRequest = emailTemplates.reviewRequest({ ...testData, items: [] } as any);
      expect(reviewRequest.subject).toBeTruthy();
      expect(reviewRequest.html).toBeTruthy();
      expect(reviewRequest.text).toBeTruthy();
    });
  });
});