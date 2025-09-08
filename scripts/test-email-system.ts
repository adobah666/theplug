#!/usr/bin/env tsx

/**
 * Test script for the email system
 * This script tests the email configuration and basic functionality
 */

import dotenv from 'dotenv';
import { emailService, emailNotificationService, validateEmailConfig } from '../lib/email';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testEmailConfiguration() {
  console.log('🔧 Testing Email Configuration...\n');

  try {
    validateEmailConfig();
    console.log('✅ Email configuration is valid');
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }

  return true;
}

async function testEmailService() {
  console.log('\n📧 Testing Email Service...\n');

  try {
    // Test email validation
    const validEmail = await emailService.verifyEmailAddress('test@example.com');
    const invalidEmail = await emailService.verifyEmailAddress('invalid-email');
    
    console.log('✅ Email validation works:', { validEmail, invalidEmail });

    // Test basic email sending (this will actually send an email if AWS is configured)
    if (process.env.TEST_EMAIL_RECIPIENT) {
      console.log(`📤 Sending test email to ${process.env.TEST_EMAIL_RECIPIENT}...`);
      
      const result = await emailService.sendEmail({
        to: process.env.TEST_EMAIL_RECIPIENT,
        subject: 'Test Email from The Plug Fashion',
        html: '<h1>Test Email</h1><p>This is a test email from the email system.</p>',
        text: 'Test Email\n\nThis is a test email from the email system.'
      });

      console.log('✅ Test email sent successfully:', result.messageId);
    } else {
      console.log('ℹ️  Set TEST_EMAIL_RECIPIENT environment variable to test actual email sending');
    }

  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }

  return true;
}

async function testEmailTemplates() {
  console.log('\n📝 Testing Email Templates...\n');

  try {
    // Test order confirmation template
    const orderConfirmation = await emailNotificationService.queueOrderConfirmation('test@example.com', {
      customerName: 'John Doe',
      orderNumber: 'TEST-12345',
      orderDate: new Date().toLocaleDateString(),
      items: [
        {
          name: 'Test Product',
          quantity: 1,
          price: 29.99,
          image: 'https://example.com/product.jpg'
        }
      ],
      subtotal: 29.99,
      shipping: 5.99,
      tax: 2.40,
      total: 38.38,
      shippingAddress: {
        name: 'John Doe',
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country'
      }
    });

    console.log('✅ Order confirmation template queued:', orderConfirmation);

    // Test welcome email template
    const welcomeEmail = await emailNotificationService.queueWelcomeEmail('test@example.com', {
      customerName: 'Jane Doe',
      email: 'test@example.com',
      loginUrl: 'https://example.com/account'
    });

    console.log('✅ Welcome email template queued:', welcomeEmail);

    // Test password reset template
    const passwordReset = await emailNotificationService.queuePasswordReset('test@example.com', {
      customerName: 'Bob Smith',
      resetUrl: 'https://example.com/reset?token=abc123',
      expiresIn: '1 hour'
    });

    console.log('✅ Password reset template queued:', passwordReset);

  } catch (error) {
    console.error('❌ Email template error:', error);
    return false;
  }

  return true;
}

async function testEmailQueue() {
  console.log('\n⏳ Testing Email Queue...\n');

  try {
    const { emailQueue } = await import('../lib/email/queue');
    
    // Get queue status
    const status = emailQueue.getQueueStatus();
    console.log('📊 Queue status:', status);

    // Wait a bit for queue processing
    console.log('⏳ Waiting for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalStatus = emailQueue.getQueueStatus();
    console.log('📊 Final queue status:', finalStatus);

    console.log('✅ Email queue test completed');

  } catch (error) {
    console.error('❌ Email queue error:', error);
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 Starting Email System Tests\n');
  console.log('=' .repeat(50));

  const tests = [
    testEmailConfiguration,
    testEmailService,
    testEmailTemplates,
    testEmailQueue
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed > 0) {
    console.log('\n💡 Tips:');
    console.log('- Make sure AWS credentials are configured in .env.local');
    console.log('- Verify SES is set up and email addresses are verified');
    console.log('- Check that all required environment variables are set');
    process.exit(1);
  } else {
    console.log('\n🎉 All email system tests passed!');
    process.exit(0);
  }
}

// Run the tests
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});