import { SMSService } from './service';
import WhatsAppService from '@/lib/whatsapp/service';
import connectDB from '@/lib/db/connection';
import mongoose from 'mongoose';

interface QueuedSMSMessage {
  id: string;
  to: string;
  content: string;
  type: 'ORDER_CONFIRMATION' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'REFUND_APPROVED' | 'PAYMENT_FAILED' | 'WELCOME' | 'PASSWORD_RESET' | 'ORDER_REMINDER' | 'STOCK_ALERT' | 'PROMOTIONAL' | 'MANUAL';
  recipientId?: string | null;
  fromName?: string;
  sentBy?: string | null;
  priority: number; // 1 = high, 2 = medium, 3 = low
  scheduledAt: Date;
  retryCount: number;
  maxRetries: number;
  orderId?: string | null;
  userId?: string | null;
}

export class SMSQueueService {
  private static instance: SMSQueueService;
  private queue: QueuedSMSMessage[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 1000; // Unlimited batch size for production
  private readonly PROCESSING_INTERVAL = 12000; // 12 seconds (5 per minute = every 12 seconds)
  private readonly MAX_RETRIES = 3;

  private constructor() {
    if (!isBuildTime()) {
      this.startProcessing();
    } else {
      console.log('[SMSQueue] Skipping queue processing during build');
    }
  }

  // Public: run a single processing cycle (for cron/uptime robot)
  public async tick(): Promise<{ pendingBefore: number; pendingAfter: number; ran: boolean }> {
    try {
      await connectDB();
      // If not running interval (e.g., in serverless or during cron), ensure we have latest pending
      if (!this.processingInterval || this.queue.length === 0) {
        await this.loadPendingMessages();
      }
      const before = this.queue.length;
      await this.processQueue();
      const after = this.queue.length;
      return { pendingBefore: before, pendingAfter: after, ran: true };
    } catch (e) {
      console.error('SMSQueue tick error:', e);
      return { pendingBefore: this.queue.length, pendingAfter: this.queue.length, ran: false };
    }
  }

  public static getInstance(): SMSQueueService {
    if (!SMSQueueService.instance) {
      SMSQueueService.instance = new SMSQueueService();
    }
    return SMSQueueService.instance;
  }

  // Add message to queue
  public async addToQueue(message: {
    to: string;
    content: string;
    type?: 'ORDER_CONFIRMATION' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'REFUND_APPROVED' | 'PAYMENT_FAILED' | 'WELCOME' | 'PASSWORD_RESET' | 'ORDER_REMINDER' | 'STOCK_ALERT' | 'PROMOTIONAL' | 'MANUAL';
    recipientId?: string | null;
    fromName?: string;
    sentBy?: string | null;
    priority?: number;
    scheduledAt?: Date;
    orderId?: string | null;
    userId?: string | null;
  }): Promise<string> {
    await connectDB();

    const queuedMessage: QueuedSMSMessage = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to: message.to,
      content: message.content,
      type: message.type || 'MANUAL',
      recipientId: message.recipientId || null,
      fromName: message.fromName,
      sentBy: message.sentBy || null,
      priority: message.priority || 2, // Default to medium priority
      scheduledAt: message.scheduledAt || new Date(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
      orderId: message.orderId || null,
      userId: message.userId || null,
    };

    // Store in database for persistence
    const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
    await SMSQueue.create({
      id: queuedMessage.id,
      phoneNumber: queuedMessage.to,
      content: queuedMessage.content,
      type: queuedMessage.type,
      recipientId: queuedMessage.recipientId,
      fromName: queuedMessage.fromName,
      sentBy: queuedMessage.sentBy,
      priority: queuedMessage.priority,
      scheduledAt: queuedMessage.scheduledAt,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: queuedMessage.maxRetries,
      orderId: queuedMessage.orderId,
      userId: queuedMessage.userId,
    });

    // Add to in-memory queue
    this.queue.push(queuedMessage);
    this.sortQueue();

    console.log(`SMS added to queue: ${queuedMessage.id} for ${queuedMessage.to}`);
    return queuedMessage.id;
  }

  // Add multiple messages to queue (bulk operation)
  public async addBulkToQueue(messages: Array<{
    to: string;
    content: string;
    type?: 'ORDER_CONFIRMATION' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'REFUND_APPROVED' | 'PAYMENT_FAILED' | 'WELCOME' | 'PASSWORD_RESET' | 'ORDER_REMINDER' | 'STOCK_ALERT' | 'PROMOTIONAL' | 'MANUAL';
    recipientId?: string | null;
    fromName?: string;
    sentBy?: string | null;
    priority?: number;
    scheduledAt?: Date;
    orderId?: string | null;
    userId?: string | null;
  }>): Promise<string[]> {
    await connectDB();

    const queuedMessages: QueuedSMSMessage[] = [];
    const dbRecords = [];

    for (const message of messages) {
      const queuedMessage: QueuedSMSMessage = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: message.to,
        content: message.content,
        type: message.type || 'MANUAL',
        recipientId: message.recipientId || null,
        fromName: message.fromName,
        sentBy: message.sentBy || null,
        priority: message.priority || 2,
        scheduledAt: message.scheduledAt || new Date(),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        orderId: message.orderId || null,
        userId: message.userId || null,
      };

      queuedMessages.push(queuedMessage);
      dbRecords.push({
        id: queuedMessage.id,
        phoneNumber: queuedMessage.to,
        content: queuedMessage.content,
        type: queuedMessage.type,
        recipientId: queuedMessage.recipientId,
        fromName: queuedMessage.fromName,
        sentBy: queuedMessage.sentBy,
        priority: queuedMessage.priority,
        scheduledAt: queuedMessage.scheduledAt,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: queuedMessage.maxRetries,
        orderId: queuedMessage.orderId,
        userId: queuedMessage.userId,
      });
    }

    // Bulk insert to database
    const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
    await SMSQueue.insertMany(dbRecords);

    // Add to in-memory queue
    this.queue.push(...queuedMessages);
    this.sortQueue();

    console.log(`${queuedMessages.length} SMS messages added to queue`);
    return queuedMessages.map(msg => msg.id);
  }

  // Sort queue by priority and scheduled time
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First sort by priority (1 = high, 2 = medium, 3 = low)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then sort by scheduled time (earlier first)
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  }

  // Start the processing interval
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Load pending messages from database on startup
    this.loadPendingMessages();

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.PROCESSING_INTERVAL);

    console.log('SMS Queue processing started');
  }

  // Load pending messages from database (exposed for cron tick)
  public async loadPendingMessages(): Promise<void> {
    try {
      await connectDB();
      
      const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
      const pendingMessages = await SMSQueue.find({
        status: 'PENDING',
        scheduledAt: {
          $lte: new Date(),
        },
      })
      .sort({ priority: 1, scheduledAt: 1 })
      .lean();

      this.queue = pendingMessages.map((msg: any) => ({
        id: msg.id,
        to: msg.phoneNumber,
        content: msg.content,
        type: msg.type as any,
        recipientId: msg.recipientId,
        fromName: msg.fromName || undefined,
        sentBy: msg.sentBy,
        priority: msg.priority,
        scheduledAt: msg.scheduledAt,
        retryCount: msg.retryCount,
        maxRetries: msg.maxRetries,
        orderId: msg.orderId,
        userId: msg.userId,
      }));

      console.log(`Loaded ${this.queue.length} pending SMS messages from database`);
    } catch (error) {
      console.error('Error loading pending SMS messages:', error);
    }
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing SMS queue: ${this.queue.length} messages pending`);

    try {
      await connectDB();
      
      // Get messages ready to be sent
      const now = new Date();
      const readyMessages = this.queue.filter(msg => msg.scheduledAt <= now);
      
      if (readyMessages.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Take only BATCH_SIZE messages to respect rate limits
      const batch = readyMessages.slice(0, this.BATCH_SIZE);
      
      // Group messages by content and sender to optimize bulk sending
      const messageGroups = this.groupMessagesForBulkSending(batch);
      
      // Process each group using bulk API
      for (const group of messageGroups) {
        await this.processBulkMessages(group);
      }

      // Remove processed messages from queue
      this.queue = this.queue.filter(msg => !batch.some(batchMsg => batchMsg.id === msg.id));

    } catch (error) {
      console.error('Error processing SMS queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Group messages for bulk sending (same content and sender)
  private groupMessagesForBulkSending(messages: QueuedSMSMessage[]): QueuedSMSMessage[][] {
    const groups = new Map<string, QueuedSMSMessage[]>();
    
    for (const message of messages) {
      // Create a key based on content and sender to group similar messages
      const key = `${message.content}|${message.fromName || 'default'}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(message);
    }
    
    return Array.from(groups.values());
  }

  // Process a group of messages using bulk API
  private async processBulkMessages(messages: QueuedSMSMessage[]): Promise<void> {
    if (messages.length === 0) return;

    try {
      console.log(`Sending bulk SMS: ${messages.length} messages with same content`);

      // Use bulk API for multiple messages with same content
      if (messages.length > 1) {
        const phoneNumbers = messages.map(msg => msg.to);
        const sampleMessage = messages[0];

        const result = await SMSService.sendBulkSMS([{
          to: phoneNumbers,
          content: sampleMessage.content,
          from: sampleMessage.fromName
        }]);

        if (result.success) {
          // Mark all messages as sent
          const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
          const SMSLog = (await import('@/lib/db/models/SMSLog')).default;
          
          for (const message of messages) {
            await SMSQueue.updateOne(
              { id: message.id },
              {
                status: 'SENT',
                sentAt: new Date(),
                messageId: `bulk_${Date.now()}`,
              }
            );

            // Log successful SMS
            await SMSLog.create({
              phoneNumber: message.to,
              content: message.content,
              type: message.type,
              status: 'SENT',
              sentBy: message.sentBy,
              recipientId: message.recipientId,
              messageId: `bulk_${Date.now()}`,
              orderId: message.orderId,
              userId: message.userId,
            });

            // Mirror to WhatsApp (best-effort, non-blocking on failure)
            try {
              if (WhatsAppService.isEnabled()) {
                await WhatsAppService.sendText(message.to, message.content);
              }
            } catch (waErr) {
              console.warn('WhatsApp mirror send failed (bulk item):', waErr);
            }
          }
          console.log(`Bulk SMS sent successfully: ${messages.length} messages`);
        } else {
          // Handle bulk failure - mark all as failed
          for (const message of messages) {
            await this.handleFailedMessage(message, result.message);
          }
        }
      } else {
        // Single message - use individual API
        await this.processSingleMessage(messages[0]);
      }
    } catch (error) {
      console.error(`Error sending bulk SMS:`, error);
      // Handle error for all messages in the group
      for (const message of messages) {
        await this.handleFailedMessage(message, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  // Process a single message (fallback for individual messages)
  private async processSingleMessage(message: QueuedSMSMessage): Promise<void> {
    try {
      console.log(`Sending SMS: ${message.id} to ${message.to}`);

      const result = await SMSService.sendSMS(
        message.to,
        message.content,
        message.fromName
      );

      if (result.success) {
        // Mark as sent in database
        const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
        const SMSLog = (await import('@/lib/db/models/SMSLog')).default;
        
        await SMSQueue.updateOne(
          { id: message.id },
          {
            status: 'SENT',
            sentAt: new Date(),
            messageId: result.messageId,
          }
        );

        // Log successful SMS
        await SMSLog.create({
          phoneNumber: message.to,
          content: message.content,
          type: message.type,
          status: 'SENT',
          sentBy: message.sentBy,
          recipientId: message.recipientId,
          messageId: result.messageId,
          orderId: message.orderId,
          userId: message.userId,
        });

        console.log(`SMS sent successfully: ${message.id}`);

        // Mirror to WhatsApp (best-effort)
        try {
          if (WhatsAppService.isEnabled()) {
            await WhatsAppService.sendText(message.to, message.content);
          }
        } catch (waErr) {
          console.warn('WhatsApp mirror send failed:', waErr);
        }
      } else {
        // Handle failure
        await this.handleFailedMessage(message, result.message);
      }
    } catch (error) {
      console.error(`Error sending SMS ${message.id}:`, error);
      await this.handleFailedMessage(message, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Handle failed message (retry or mark as failed)
  private async handleFailedMessage(message: QueuedSMSMessage, errorMessage: string): Promise<void> {
    message.retryCount++;

    if (message.retryCount < message.maxRetries) {
      // Schedule retry (exponential backoff)
      const retryDelay = Math.pow(2, message.retryCount) * 60000; // 2^n minutes
      message.scheduledAt = new Date(Date.now() + retryDelay);
      
      // Update database
      const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
      await SMSQueue.updateOne(
        { id: message.id },
        {
          retryCount: message.retryCount,
          scheduledAt: message.scheduledAt,
          lastError: errorMessage,
        }
      );

      // Add back to queue for retry
      this.queue.push(message);
      this.sortQueue();

      console.log(`SMS ${message.id} scheduled for retry ${message.retryCount}/${message.maxRetries} in ${retryDelay/1000} seconds`);
    } else {
      // Mark as failed permanently
      const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
      const SMSLog = (await import('@/lib/db/models/SMSLog')).default;
      
      await SMSQueue.updateOne(
        { id: message.id },
        {
          status: 'FAILED',
          retryCount: message.retryCount,
          lastError: errorMessage,
        }
      );

      // Log failed SMS
      await SMSLog.create({
        phoneNumber: message.to,
        content: message.content,
        type: message.type,
        status: 'FAILED',
        sentBy: message.sentBy,
        recipientId: message.recipientId,
        errorMessage: errorMessage,
        orderId: message.orderId,
        userId: message.userId,
      });

      console.log(`SMS ${message.id} failed permanently after ${message.maxRetries} retries`);
    }
  }

  // Get queue status
  public getQueueStatus(): {
    pending: number;
    processing: boolean;
    nextProcessing: Date | null;
  } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
      nextProcessing: this.processingInterval ? new Date(Date.now() + this.PROCESSING_INTERVAL) : null,
    };
  }

  // Stop processing (for cleanup)
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('SMS Queue processing stopped');
  }

  // Clear queue (emergency use)
  public async clearQueue(): Promise<void> {
    await connectDB();
    this.queue = [];
    const SMSQueue = (await import('@/lib/db/models/SMSQueue')).default;
    await SMSQueue.updateMany(
      { status: 'PENDING' },
      { status: 'CANCELLED' }
    );
    console.log('SMS Queue cleared');
  }
}

function isBuildTime(): boolean {
  try {
    // NEXT_PHASE is set during build, but also detect by argv
    if (process.env.NEXT_PHASE === 'phase-production-build') return true;
    const argv = (process.argv || []).join(' ');
    return argv.includes('next build') || argv.includes('next/dist/build');
  } catch {
    return false;
  }
}

// Export singleton instance (always defined; constructor itself is guarded)
export const smsQueue = SMSQueueService.getInstance();
