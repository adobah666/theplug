import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '@/lib/email/service';

// Mock AWS SDK
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn()
  })),
  SendEmailCommand: vi.fn()
}));

// Mock config
vi.mock('@/lib/email/config', () => ({
  sesClient: {
    send: vi.fn()
  },
  emailConfig: {
    fromEmail: 'test@example.com',
    fromName: 'Test Store',
    replyToEmail: 'reply@example.com'
  },
  validateEmailConfig: vi.fn()
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockSend: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock the SES client send method
    const configModule = await import('@/lib/email/config');
    mockSend = vi.fn();
    configModule.sesClient.send = mockSend;
    
    emailService = new EmailService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      // Arrange
      const mockMessageId = 'test-message-id-123';
      mockSend.mockResolvedValue({ MessageId: mockMessageId });

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text'
      };

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result).toEqual({ messageId: mockMessageId });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple recipients', async () => {
      // Arrange
      const mockMessageId = 'test-message-id-456';
      mockSend.mockResolvedValue({ MessageId: mockMessageId });

      const emailOptions = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text'
      };

      // Act
      const result = await emailService.sendEmail(emailOptions);

      // Assert
      expect(result).toEqual({ messageId: mockMessageId });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error when SES fails', async () => {
      // Arrange
      const errorMessage = 'SES Error';
      mockSend.mockRejectedValue(new Error(errorMessage));

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text'
      };

      // Act & Assert
      await expect(emailService.sendEmail(emailOptions)).rejects.toThrow(`Failed to send email: ${errorMessage}`);
    });

    it('should throw error when no message ID is returned', async () => {
      // Arrange
      mockSend.mockResolvedValue({}); // No MessageId

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test Text'
      };

      // Act & Assert
      await expect(emailService.sendEmail(emailOptions)).rejects.toThrow('Failed to send email: No message ID returned');
    });
  });

  describe('sendTemplate', () => {
    it('should send template email successfully', async () => {
      // Arrange
      const mockMessageId = 'template-message-id';
      mockSend.mockResolvedValue({ MessageId: mockMessageId });

      const template = {
        subject: 'Template Subject',
        html: '<h1>Template HTML</h1>',
        text: 'Template Text'
      };

      // Act
      const result = await emailService.sendTemplate('recipient@example.com', template);

      // Assert
      expect(result).toEqual({ messageId: mockMessageId });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails in batches', async () => {
      // Arrange
      const mockMessageId = 'bulk-message-id';
      mockSend.mockResolvedValue({ MessageId: mockMessageId });

      const recipients = Array.from({ length: 75 }, (_, i) => `user${i}@example.com`);
      const template = {
        subject: 'Bulk Subject',
        html: '<h1>Bulk HTML</h1>',
        text: 'Bulk Text'
      };

      // Act
      const result = await emailService.sendBulkEmail(recipients, template);

      // Assert
      expect(result.messageIds).toHaveLength(2); // 75 recipients = 2 batches (50 + 25)
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should continue with other batches if one fails', async () => {
      // Arrange
      mockSend
        .mockRejectedValueOnce(new Error('First batch failed'))
        .mockResolvedValueOnce({ MessageId: 'second-batch-id' });

      const recipients = Array.from({ length: 75 }, (_, i) => `user${i}@example.com`);
      const template = {
        subject: 'Bulk Subject',
        html: '<h1>Bulk HTML</h1>',
        text: 'Bulk Text'
      };

      // Act
      const result = await emailService.sendBulkEmail(recipients, template);

      // Assert
      expect(result.messageIds).toHaveLength(1); // Only successful batch
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyEmailAddress', () => {
    it('should validate correct email addresses', async () => {
      // Act & Assert
      expect(await emailService.verifyEmailAddress('test@example.com')).toBe(true);
      expect(await emailService.verifyEmailAddress('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', async () => {
      // Act & Assert
      expect(await emailService.verifyEmailAddress('invalid-email')).toBe(false);
      expect(await emailService.verifyEmailAddress('test@')).toBe(false);
      expect(await emailService.verifyEmailAddress('@example.com')).toBe(false);
      expect(await emailService.verifyEmailAddress('')).toBe(false);
    });
  });
});