import { smsQueue } from './queue';
import { SMSService } from './service';

/**
 * SMS notification utilities for common e-commerce scenarios
 */
export class SMSNotifications {
  
  /**
   * Send welcome SMS to new user
   */
  static async sendWelcomeSMS(userId: string, customerName: string, phoneNumber: string): Promise<void> {
    try {
      const smsContent = SMSService.getWelcomeMessage(customerName);
      
      await smsQueue.addToQueue({
        to: phoneNumber,
        content: smsContent,
        type: 'WELCOME',
        priority: 3, // Low priority for welcome messages
        userId: userId,
        recipientId: userId
      });
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
    }
  }

  /**
   * Send password reset SMS
   */
  static async sendPasswordResetSMS(userId: string, customerName: string, phoneNumber: string, resetCode: string): Promise<void> {
    try {
      const smsContent = SMSService.getPasswordResetMessage(customerName, resetCode);
      
      await smsQueue.addToQueue({
        to: phoneNumber,
        content: smsContent,
        type: 'PASSWORD_RESET',
        priority: 1, // High priority for security-related messages
        userId: userId,
        recipientId: userId
      });
    } catch (error) {
      console.error('Failed to send password reset SMS:', error);
    }
  }

  /**
   * Send promotional SMS to multiple users
   */
  static async sendPromotionalSMS(
    recipients: Array<{ userId: string; customerName: string; phoneNumber: string }>,
    discount: number,
    code?: string,
    scheduledAt?: Date
  ): Promise<void> {
    try {
      const messages = recipients.map(recipient => ({
        to: recipient.phoneNumber,
        content: SMSService.getPromotionalMessage(recipient.customerName, discount, code),
        type: 'PROMOTIONAL' as const,
        priority: 3, // Low priority for promotional messages
        userId: recipient.userId,
        recipientId: recipient.userId,
        scheduledAt: scheduledAt
      }));

      await smsQueue.addBulkToQueue(messages);
    } catch (error) {
      console.error('Failed to send promotional SMS:', error);
    }
  }

  /**
   * Send stock alert SMS
   */
  static async sendStockAlertSMS(userId: string, customerName: string, phoneNumber: string, productName: string): Promise<void> {
    try {
      const smsContent = SMSService.getStockAlertMessage(customerName, productName);
      
      await smsQueue.addToQueue({
        to: phoneNumber,
        content: smsContent,
        type: 'STOCK_ALERT',
        priority: 2, // Medium priority for stock alerts
        userId: userId,
        recipientId: userId
      });
    } catch (error) {
      console.error('Failed to send stock alert SMS:', error);
    }
  }

  /**
   * Send order reminder SMS for pending payments
   */
  static async sendOrderReminderSMS(
    userId: string, 
    customerName: string, 
    phoneNumber: string, 
    orderNumber: string, 
    orderId: string,
    daysWaiting: number
  ): Promise<void> {
    try {
      const smsContent = SMSService.getOrderReminderMessage(customerName, orderNumber, daysWaiting);
      
      await smsQueue.addToQueue({
        to: phoneNumber,
        content: smsContent,
        type: 'ORDER_REMINDER',
        priority: 2, // Medium priority for reminders
        userId: userId,
        orderId: orderId,
        recipientId: userId
      });
    } catch (error) {
      console.error('Failed to send order reminder SMS:', error);
    }
  }

  /**
   * Send bulk SMS to all users with phone numbers
   */
  static async sendBulkAnnouncementSMS(content: string, scheduledAt?: Date): Promise<number> {
    try {
      const User = (await import('@/lib/db/models/User')).default;
      
      // Get all users with phone numbers
      const users = await User.find({ 
        phone: { $exists: true, $nin: [null, ''] } 
      }).select('_id firstName lastName phone').lean();

      if (users.length === 0) {
        console.log('No users with phone numbers found for bulk SMS');
        return 0;
      }

      const messages = users.map((user: any) => ({
        to: user.phone,
        content: content,
        type: 'MANUAL' as const,
        priority: 3, // Low priority for bulk announcements
        userId: String(user._id),
        recipientId: String(user._id),
        ...(scheduledAt && { scheduledAt: scheduledAt })
      }));

      await smsQueue.addBulkToQueue(messages);
      return messages.length;
    } catch (error) {
      console.error('Failed to send bulk announcement SMS:', error);
      return 0;
    }
  }
}
