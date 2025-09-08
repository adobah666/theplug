# Email System Documentation

This email system provides comprehensive email functionality for The Plug Fashion e-commerce platform using AWS SES.

## Features

- **Order Confirmation Emails**: Sent automatically when orders are created
- **Password Reset Emails**: Sent when users request password resets
- **Welcome Emails**: Sent when new users register
- **Order Status Updates**: Sent when order status changes
- **Review Request Emails**: Sent automatically after order delivery
- **Email Queue System**: Reliable email delivery with retry logic
- **Bulk Email Support**: For promotional campaigns
- **Template System**: Responsive HTML and text email templates

## Setup

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-ses @aws-sdk/types
```

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL=noreply@yourdomain.com
SES_FROM_NAME=The Plug Fashion
```

### 3. AWS SES Setup

1. Create an AWS account and set up SES
2. Verify your sender email address in SES
3. If in sandbox mode, verify recipient email addresses
4. Request production access for sending to unverified emails
5. Create IAM user with SES sending permissions

## Usage

### Basic Email Sending

```typescript
import { emailService } from '@/lib/email';

// Send a simple email
const result = await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>',
  text: 'Hello World'
});
```

### Using Email Templates

```typescript
import { emailNotificationService } from '@/lib/email';

// Send order confirmation
await emailNotificationService.sendOrderConfirmation('customer@example.com', {
  customerName: 'John Doe',
  orderNumber: 'ORD-12345',
  orderDate: '2024-01-15',
  items: [
    {
      name: 'Product Name',
      quantity: 1,
      price: 29.99,
      image: 'https://example.com/image.jpg'
    }
  ],
  subtotal: 29.99,
  shipping: 5.99,
  tax: 2.40,
  total: 38.38,
  shippingAddress: {
    name: 'John Doe',
    street: '123 Main St',
    city: 'City',
    state: 'State',
    zipCode: '12345',
    country: 'Country'
  }
});
```

### Using Email Queue (Recommended)

```typescript
import { emailNotificationService } from '@/lib/email';

// Queue emails for reliable delivery
await emailNotificationService.queueOrderConfirmation('customer@example.com', orderData);
await emailNotificationService.queueWelcomeEmail('newuser@example.com', welcomeData);
await emailNotificationService.queuePasswordReset('user@example.com', resetData);
```

### Bulk Email Sending

```typescript
import { emailNotificationService } from '@/lib/email';

const emails = ['user1@example.com', 'user2@example.com'];
const result = await emailNotificationService.sendBulkNotifications(
  emails, 
  'welcome', 
  welcomeData
);
```

## Email Templates

The system includes the following pre-built templates:

### Order Confirmation
- Sent when orders are created
- Includes order details, items, pricing, and shipping information
- High priority in queue

### Password Reset
- Sent when users request password resets
- Includes secure reset link with expiration
- High priority in queue

### Welcome Email
- Sent when new users register
- Includes account information and getting started tips
- Normal priority in queue

### Order Status Updates
- Sent when order status changes (shipped, delivered, etc.)
- Includes tracking information when available
- Normal priority in queue

### Review Requests
- Sent automatically 72 hours after order delivery
- Includes links to review each purchased item
- Low priority in queue with scheduling

## Email Queue System

The email queue provides:

- **Reliability**: Automatic retries on failure
- **Priority Handling**: High, normal, and low priority emails
- **Scheduling**: Delayed email sending (e.g., review requests)
- **Batch Processing**: Efficient handling of multiple emails
- **Error Handling**: Graceful failure handling with logging

### Queue Priorities

- **High**: Order confirmations, password resets
- **Normal**: Welcome emails, order status updates
- **Low**: Review requests, promotional emails

## Testing

### Run Email System Tests

```bash
npm run test:email
```

### Run Unit Tests

```bash
npm run test -- __tests__/lib/email
```

### Test Email Configuration

```bash
# Set TEST_EMAIL_RECIPIENT in .env.local to test actual sending
TEST_EMAIL_RECIPIENT=your-email@example.com npm run test:email
```

## Integration Points

The email system is automatically integrated with:

- **User Registration** (`/api/auth/register`) - Sends welcome emails
- **Password Reset** (`/api/auth/reset-password`) - Sends reset emails
- **Order Creation** (`/api/orders`) - Sends order confirmations
- **Order Status Updates** (`/api/orders/[id]/status`) - Sends status updates
- **Order Delivery** - Automatically schedules review requests

## Error Handling

- Email failures don't break core functionality
- Failed emails are retried automatically
- Comprehensive error logging
- Graceful degradation when AWS SES is unavailable

## Security Considerations

- Email addresses are validated before sending
- Reset tokens are cryptographically secure
- Sensitive information is not logged
- Rate limiting through SES quotas
- Environment variables for credentials

## Monitoring

Monitor email system health through:

- Queue status via `emailQueue.getQueueStatus()`
- AWS SES sending statistics
- Application logs for email errors
- Failed email tracking

## Troubleshooting

### Common Issues

1. **SES Sandbox Mode**: Verify recipient emails in AWS console
2. **Invalid Credentials**: Check AWS access keys and permissions
3. **Rate Limits**: Monitor SES sending quotas
4. **Template Errors**: Validate template data before sending

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

## Performance

- Bulk emails are sent in batches of 50 (SES limit)
- Queue processing is asynchronous and non-blocking
- Failed emails are retried with exponential backoff
- Memory usage is optimized for large email volumes