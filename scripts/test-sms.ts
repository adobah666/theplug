import dotenv from 'dotenv';
import { SMSService } from '../lib/sms/service';
import { smsQueue } from '../lib/sms/queue';
import connectDB from '../lib/db/connection';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSMSIntegration() {
  console.log('🚀 Testing SMS Integration...\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Test 1: Direct SMS sending
    console.log('\n📱 Test 1: Direct SMS sending');
    const testPhone = '0551234567'; // Replace with a valid Ghana number for testing
    const testMessage = 'Hello! This is a test message from ThePlug SMS system. 🎉';
    
    const directResult = await SMSService.sendSMS(testPhone, testMessage);
    console.log('Direct SMS result:', directResult);

    // Test 2: SMS Queue functionality
    console.log('\n⏰ Test 2: SMS Queue functionality');
    const queueResult = await smsQueue.addToQueue({
      to: testPhone,
      content: 'This is a queued test message from ThePlug! 📦',
      type: 'MANUAL',
      priority: 1
    });
    console.log('Queue SMS result:', queueResult);

    // Test 3: Template messages
    console.log('\n📋 Test 3: Template messages');
    const templates = {
      orderConfirmation: SMSService.getOrderConfirmationMessage('John Doe', 'ORD-20241217-123456', 150.00),
      orderShipped: SMSService.getOrderShippedMessage('Jane Smith', 'ORD-20241217-789012', 'TRK123456'),
      orderDelivered: SMSService.getOrderDeliveredMessage('Bob Johnson', 'ORD-20241217-345678'),
      orderCancelled: SMSService.getOrderCancelledMessage('Alice Brown', 'ORD-20241217-901234', 'Customer request'),
      refundApproved: SMSService.getRefundApprovedMessage('Charlie Wilson', 'ORD-20241217-567890', 75.50),
      paymentFailed: SMSService.getPaymentFailedMessage('Diana Davis', 'ORD-20241217-234567'),
      welcome: SMSService.getWelcomeMessage('New Customer'),
      passwordReset: SMSService.getPasswordResetMessage('Test User', '123456'),
      promotional: SMSService.getPromotionalMessage('Valued Customer', 20, 'SAVE20'),
      stockAlert: SMSService.getStockAlertMessage('Fashion Lover', 'Vintage Red Shoes')
    };

    console.log('Template messages generated:');
    Object.entries(templates).forEach(([type, message]) => {
      console.log(`  ${type}: ${message.substring(0, 50)}...`);
    });

    // Test 4: Queue status
    console.log('\n📊 Test 4: Queue status');
    const queueStatus = smsQueue.getQueueStatus();
    console.log('Queue status:', queueStatus);

    // Test 5: Bulk SMS (commented out to avoid spam)
    console.log('\n📢 Test 5: Bulk SMS (simulation)');
    const bulkMessages = [
      { to: '0551234567', content: 'Bulk message 1' },
      { to: '0241234567', content: 'Bulk message 2' },
      { to: '0201234567', content: 'Bulk message 3' }
    ];
    
    console.log(`Would send ${bulkMessages.length} bulk messages (skipped for testing)`);
    // Uncomment the line below to actually test bulk SMS
    // const bulkResult = await SMSService.sendBulkSMS(bulkMessages);
    // console.log('Bulk SMS result:', bulkResult);

    console.log('\n✅ SMS Integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Replace test phone numbers with real ones for actual testing');
    console.log('2. Monitor the SMS queue processing in your application');
    console.log('3. Check SMS logs in the admin panel');
    console.log('4. Test the integration with actual order flows');

  } catch (error) {
    console.error('❌ SMS Integration test failed:', error);
  } finally {
    // Stop queue processing for testing
    smsQueue.stopProcessing();
    process.exit(0);
  }
}

// Run the test
testSMSIntegration();
