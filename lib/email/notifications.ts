import { emailService } from './service';
import { emailQueue } from './queue';
import { emailTemplates, OrderConfirmationData, PasswordResetData, WelcomeEmailData, OrderStatusData, ReviewRequestData } from './templates';

export class EmailNotificationService {
  async sendOrderConfirmation(email: string, data: OrderConfirmationData): Promise<{ messageId: string }> {
    const template = emailTemplates.orderConfirmation(data);
    return emailService.sendTemplate(email, template);
  }

  async sendPasswordReset(email: string, data: PasswordResetData): Promise<{ messageId: string }> {
    const template = emailTemplates.passwordReset(data);
    return emailService.sendTemplate(email, template);
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<{ messageId: string }> {
    const template = emailTemplates.welcome(data);
    return emailService.sendTemplate(email, template);
  }

  async sendOrderStatusUpdate(email: string, data: OrderStatusData): Promise<{ messageId: string }> {
    const template = emailTemplates.orderStatusUpdate(data);
    return emailService.sendTemplate(email, template);
  }

  async sendReviewRequest(email: string, data: ReviewRequestData): Promise<{ messageId: string }> {
    const template = emailTemplates.reviewRequest(data);
    return emailService.sendTemplate(email, template);
  }

  // Queued versions for better reliability
  async queueOrderConfirmation(email: string, data: OrderConfirmationData): Promise<string> {
    const template = emailTemplates.orderConfirmation(data);
    return emailQueue.addEmail(email, template, 'high');
  }

  async queuePasswordReset(email: string, data: PasswordResetData): Promise<string> {
    const template = emailTemplates.passwordReset(data);
    return emailQueue.addEmail(email, template, 'high');
  }

  async queueWelcomeEmail(email: string, data: WelcomeEmailData): Promise<string> {
    const template = emailTemplates.welcome(data);
    return emailQueue.addEmail(email, template, 'normal');
  }

  async queueOrderStatusUpdate(email: string, data: OrderStatusData): Promise<string> {
    const template = emailTemplates.orderStatusUpdate(data);
    return emailQueue.addEmail(email, template, 'normal');
  }

  async queueReviewRequest(email: string, data: ReviewRequestData, delayHours: number = 24): Promise<string> {
    const template = emailTemplates.reviewRequest(data);
    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    return emailQueue.addEmail(email, template, 'low', scheduledAt);
  }

  // Bulk operations
  async sendBulkNotifications(emails: string[], templateType: 'welcome' | 'orderStatus' | 'reviewRequest', data: any): Promise<{ messageIds: string[] }> {
    let template;
    
    switch (templateType) {
      case 'welcome':
        template = emailTemplates.welcome(data);
        break;
      case 'orderStatus':
        template = emailTemplates.orderStatusUpdate(data);
        break;
      case 'reviewRequest':
        template = emailTemplates.reviewRequest(data);
        break;
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }

    return emailService.sendBulkEmail(emails, template);
  }
}

export const emailNotificationService = new EmailNotificationService();