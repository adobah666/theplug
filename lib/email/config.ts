import { SESClient } from '@aws-sdk/client-ses';

export const sesConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

export const sesClient = new SESClient(sesConfig);

export const emailConfig = {
  fromEmail: process.env.SES_FROM_EMAIL || 'noreply@example.com',
  fromName: process.env.SES_FROM_NAME || 'The Plug Fashion',
  replyToEmail: process.env.SES_REPLY_TO_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@example.com',
};

export const validateEmailConfig = () => {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SES_FROM_EMAIL',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required email configuration: ${missing.join(', ')}`);
  }
};