import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailQueue } from '@/lib/email/queue';

// Mock the email service
vi.mock('@/lib/email/service', () => ({
  emailService: {
    sendTemplate: vi.fn()
  }
}));

describe('EmailQueue', () => {
  let emailQueue: EmailQueue;
  let mockSendTemplate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    emailQueue = new EmailQueue({
      maxRetries: 2,
      retryDelay: 100, // Short delay for testing
      batchSize: 2
    });

    // Mock the email service
    const emailServiceModule = await import('@/lib/email/service');
    mockSendTemplate = vi.fn();
    emailServiceModule.emailService.sendTemplate = mockSendTemplate;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    emailQueue.clearQueue();
  });

  describe('addEmail', () => {
    it('should add email to queue and return job ID', async () => {
      // Arrange
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      const jobId = await emailQueue.addEmail('test@example.com', template);

      // Assert
      expect(jobId).toBeTruthy();
      expect(jobId).toMatch(/^email_\d+_/);
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(1);
    });

    it('should prioritize high priority emails', async () => {
      // Arrange
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      await emailQueue.addEmail('low@example.com', template, 'low');
      await emailQueue.addEmail('high@example.com', template, 'high');
      await emailQueue.addEmail('normal@example.com', template, 'normal');

      // Assert
      const status = emailQueue.getQueueStatus();
      expect(status.byPriority.high).toBe(1);
      expect(status.byPriority.normal).toBe(1);
      expect(status.byPriority.low).toBe(1);
    });

    it('should schedule emails for future delivery', async () => {
      // Arrange
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now

      // Act
      const jobId = await emailQueue.addEmail('test@example.com', template, 'normal', futureDate);

      // Assert
      expect(jobId).toBeTruthy();
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(1);
    });
  });

  describe('queue processing', () => {
    it('should process emails successfully', async () => {
      // Arrange
      mockSendTemplate.mockResolvedValue({ messageId: 'test-id' });
      
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      await emailQueue.addEmail('test@example.com', template);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Assert
      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      expect(mockSendTemplate).toHaveBeenCalledWith('test@example.com', template);
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(0); // Should be removed after successful send
    });

    it('should retry failed emails', async () => {
      // Arrange
      mockSendTemplate
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ messageId: 'test-id' });
      
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      await emailQueue.addEmail('test@example.com', template);
      
      // Wait for processing and retry
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert
      expect(mockSendTemplate).toHaveBeenCalledTimes(2);
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(0); // Should be removed after successful retry
    });

    it('should remove emails after max retries', async () => {
      // Arrange
      mockSendTemplate.mockRejectedValue(new Error('Always fails'));
      
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      await emailQueue.addEmail('test@example.com', template);
      
      // Wait for all retry attempts
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assert
      expect(mockSendTemplate).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(0); // Should be removed after max retries
    });

    it('should process emails in batches', async () => {
      // Arrange
      mockSendTemplate.mockResolvedValue({ messageId: 'test-id' });
      
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act - Add more emails than batch size
      await emailQueue.addEmail('test1@example.com', template);
      await emailQueue.addEmail('test2@example.com', template);
      await emailQueue.addEmail('test3@example.com', template);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Assert
      expect(mockSendTemplate).toHaveBeenCalledTimes(3);
      
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', async () => {
      // Arrange
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      // Act
      await emailQueue.addEmail('high@example.com', template, 'high');
      await emailQueue.addEmail('normal@example.com', template, 'normal');
      await emailQueue.addEmail('low@example.com', template, 'low');

      // Assert
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(3);
      expect(status.byPriority.high).toBe(1);
      expect(status.byPriority.normal).toBe(1);
      expect(status.byPriority.low).toBe(1);
      expect(status.processing).toBe(true);
    });
  });

  describe('clearQueue', () => {
    it('should clear all emails from queue', async () => {
      // Arrange
      const template = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test'
      };

      await emailQueue.addEmail('test1@example.com', template);
      await emailQueue.addEmail('test2@example.com', template);

      // Act
      emailQueue.clearQueue();

      // Assert
      const status = emailQueue.getQueueStatus();
      expect(status.total).toBe(0);
    });
  });
});