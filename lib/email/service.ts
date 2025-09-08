import { SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { sesClient, emailConfig, validateEmailConfig } from './config';
import { EmailTemplate } from './templates';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export class EmailService {
  constructor() {
    validateEmailConfig();
  }

  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { to, subject, html, text, replyTo, cc, bcc } = options;

    const toAddresses = Array.isArray(to) ? to : [to];

    const params: SendEmailCommandInput = {
      Source: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: cc,
        BccAddresses: bcc,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: text,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : [emailConfig.replyToEmail],
    };

    try {
      const command = new SendEmailCommand(params);
      const result = await sesClient.send(command);
      
      if (!result.MessageId) {
        throw new Error('Failed to send email: No message ID returned');
      }

      return { messageId: result.MessageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendTemplate(to: string | string[], template: EmailTemplate, options?: Partial<SendEmailOptions>): Promise<{ messageId: string }> {
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      ...options,
    });
  }

  async sendBulkEmail(recipients: string[], template: EmailTemplate, options?: Partial<SendEmailOptions>): Promise<{ messageIds: string[] }> {
    const batchSize = 50; // SES limit
    const messageIds: string[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const result = await this.sendEmail({
          to: batch,
          subject: template.subject,
          html: template.html,
          text: template.text,
          ...options,
        });
        messageIds.push(result.messageId);
      } catch (error) {
        console.error(`Failed to send email batch ${i / batchSize + 1}:`, error);
        // Continue with other batches even if one fails
      }
    }

    return { messageIds };
  }

  async verifyEmailAddress(email: string): Promise<boolean> {
    // In production, you might want to implement SES email verification
    // For now, we'll do basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailService = new EmailService();