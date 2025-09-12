export { EmailService, emailService } from './service';
export { EmailQueue, emailQueue } from './queue';
export { EmailNotificationService, emailNotificationService } from './notifications';
export { EmailJobService, emailJobService } from './jobs';
export { emailTemplates } from './templates';
export { validateEmailConfig, emailConfig } from './config';

export type {
  SendEmailOptions,
} from './service';

export type {
  EmailTemplate,
  OrderConfirmationData,
  PasswordResetData,
  WelcomeEmailData,
  OrderStatusData,
  ReviewRequestData,
} from './templates';

export type {
  EmailJob,
  EmailQueueOptions,
} from './queue';