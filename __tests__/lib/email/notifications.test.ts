import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailNotificationService } from '@/lib/email/notifications';

// Mock dependencies
vi.mock('@/lib/email/service', () => ({
  emailService: {
    sendTemplate: vi.fn(),
    sendBulkEmail: vi.fn()
  }
}));

vi.mock('@/lib/email/queue', () => ({
  emailQueue: {
    addEmail: vi.fn()
  }
}));

vi.mock('@/lib/email/templates', () => ({
  emailTemplates: {
    orderConfirmation: vi.fn(),
    passwordReset: vi.fn(),
    welcome: vi.fn(),
    orderStatusUpdate: vi.fn(),
    reviewRequest: vi.fn()
  }
}));

describe('EmailNotificationService', () => {
  let notificationService: EmailNotificationService;
  let mockEmailService: any;
  let mockEmailQueue: any;
  let mockTemplates: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    notificationService = new EmailNotificationService();
    
    // Get mocked dependencies
    const emailServiceModule = await import('@/lib/email/service');
    const emailQueueModule = await import('@/lib/email/queue');
    const emailTemplatesModule = await import('@/lib/email/templates');
    
    mockEmailService = emailServiceModule.emailService;
    mockEmailQueue = emailQueueModule.emailQueue;
    mockTemplates = emailTemplatesModule.emailTemplates;
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      // Arrange
      const email = 'customer@example.com';
      const orderData = {
        customerName: 'John Doe',
        orderNumber: 'ORD-123',
        orderDate: '2024-01-01',
        items: [],
        subtotal: 100,
        shipping: 10,
        tax: 8,
        total: 118,
        shippingAddress: {
          name: 'John Doe',
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country'
        }
      };

      const mockTemplate = {
        subject: 'Order Confirmation',
        html: '<h1>Order Confirmed</h1>',
        text: 'Order Confirmed'
      };

      mockTemplates.orderConfirmation.mockReturnValue(mockTemplate);
      mockEmailService.sendTemplate.mockResolvedValue({ messageId: 'test-id' });

      // Act
      const result = await notificationService.sendOrderConfirmation(email, orderData);

      // Assert
      expect(mockTemplates.orderConfirmation).toHaveBeenCalledWith(orderData);
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith(email, mockTemplate);
      expect(result).toEqual({ messageId: 'test-id' });
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      // Arrange
      const email = 'user@example.com';
      const resetData = {
        customerName: 'Jane Doe',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour'
      };

      const mockTemplate = {
        subject: 'Password Reset',
        html: '<h1>Reset Password</h1>',
        text: 'Reset Password'
      };

      mockTemplates.passwordReset.mockReturnValue(mockTemplate);
      mockEmailService.sendTemplate.mockResolvedValue({ messageId: 'reset-id' });

      // Act
      const result = await notificationService.sendPasswordReset(email, resetData);

      // Assert
      expect(mockTemplates.passwordReset).toHaveBeenCalledWith(resetData);
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith(email, mockTemplate);
      expect(result).toEqual({ messageId: 'reset-id' });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const welcomeData = {
        customerName: 'New User',
        email: 'newuser@example.com',
        loginUrl: 'https://example.com/login'
      };

      const mockTemplate = {
        subject: 'Welcome!',
        html: '<h1>Welcome</h1>',
        text: 'Welcome'
      };

      mockTemplates.welcome.mockReturnValue(mockTemplate);
      mockEmailService.sendTemplate.mockResolvedValue({ messageId: 'welcome-id' });

      // Act
      const result = await notificationService.sendWelcomeEmail(email, welcomeData);

      // Assert
      expect(mockTemplates.welcome).toHaveBeenCalledWith(welcomeData);
      expect(mockEmailService.sendTemplate).toHaveBeenCalledWith(email, mockTemplate);
      expect(result).toEqual({ messageId: 'welcome-id' });
    });
  });

  describe('queueOrderConfirmation', () => {
    it('should queue order confirmation email with high priority', async () => {
      // Arrange
      const email = 'customer@example.com';
      const orderData = {
        customerName: 'John Doe',
        orderNumber: 'ORD-123',
        orderDate: '2024-01-01',
        items: [],
        subtotal: 100,
        shipping: 10,
        tax: 8,
        total: 118,
        shippingAddress: {
          name: 'John Doe',
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country'
        }
      };

      const mockTemplate = {
        subject: 'Order Confirmation',
        html: '<h1>Order Confirmed</h1>',
        text: 'Order Confirmed'
      };

      mockTemplates.orderConfirmation.mockReturnValue(mockTemplate);
      mockEmailQueue.addEmail.mockResolvedValue('queue-job-id');

      // Act
      const result = await notificationService.queueOrderConfirmation(email, orderData);

      // Assert
      expect(mockTemplates.orderConfirmation).toHaveBeenCalledWith(orderData);
      expect(mockEmailQueue.addEmail).toHaveBeenCalledWith(email, mockTemplate, 'high');
      expect(result).toBe('queue-job-id');
    });
  });

  describe('queueReviewRequest', () => {
    it('should queue review request email with delay', async () => {
      // Arrange
      const email = 'customer@example.com';
      const reviewData = {
        customerName: 'John Doe',
        orderNumber: 'ORD-123',
        items: [
          {
            name: 'Product A',
            image: 'image.jpg',
            reviewUrl: 'https://example.com/review'
          }
        ]
      };

      const mockTemplate = {
        subject: 'Review Request',
        html: '<h1>Please Review</h1>',
        text: 'Please Review'
      };

      mockTemplates.reviewRequest.mockReturnValue(mockTemplate);
      mockEmailQueue.addEmail.mockResolvedValue('review-job-id');

      // Act
      const result = await notificationService.queueReviewRequest(email, reviewData, 48);

      // Assert
      expect(mockTemplates.reviewRequest).toHaveBeenCalledWith(reviewData);
      expect(mockEmailQueue.addEmail).toHaveBeenCalledWith(
        email, 
        mockTemplate, 
        'low', 
        expect.any(Date)
      );
      expect(result).toBe('review-job-id');
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send bulk welcome emails', async () => {
      // Arrange
      const emails = ['user1@example.com', 'user2@example.com'];
      const welcomeData = {
        customerName: 'User',
        email: 'user@example.com',
        loginUrl: 'https://example.com/login'
      };

      const mockTemplate = {
        subject: 'Welcome!',
        html: '<h1>Welcome</h1>',
        text: 'Welcome'
      };

      mockTemplates.welcome.mockReturnValue(mockTemplate);
      mockEmailService.sendBulkEmail.mockResolvedValue({ messageIds: ['id1', 'id2'] });

      // Act
      const result = await notificationService.sendBulkNotifications(emails, 'welcome', welcomeData);

      // Assert
      expect(mockTemplates.welcome).toHaveBeenCalledWith(welcomeData);
      expect(mockEmailService.sendBulkEmail).toHaveBeenCalledWith(emails, mockTemplate);
      expect(result).toEqual({ messageIds: ['id1', 'id2'] });
    });

    it('should throw error for unknown template type', async () => {
      // Arrange
      const emails = ['user@example.com'];
      const data = {};

      // Act & Assert
      await expect(
        notificationService.sendBulkNotifications(emails, 'unknown' as any, data)
      ).rejects.toThrow('Unknown template type: unknown');
    });
  });
});