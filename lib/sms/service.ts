import connectDB from '@/lib/db/connection';

interface SMSResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export class SMSService {
  private static readonly BASE_URL = 'https://smsc.hubtel.com/v1/messages/send';
  private static readonly BULK_URL = 'https://smsc.hubtel.com/v1/messages/send';

  // Bulk SMS sending method
  static async sendBulkSMS(messages: Array<{
    to: string[];
    content: string;
    from?: string;
  }>): Promise<{
    success: boolean;
    message: string;
    results?: Array<{ success: boolean; messageId?: string; error?: string; }>;
  }> {
    try {
      // Validate all phone numbers are Ghana numbers
      const allPhoneNumbers = messages.flatMap(msg => msg.to);
      for (const phoneNumber of allPhoneNumbers) {
        const normalized = phoneNumber.trim();
        const isGhanaLocal = /^0\d{9}$/.test(normalized);
        const isGhanaIntl = /^\+233\d{9}$/.test(normalized);
        if (!isGhanaLocal && !isGhanaIntl) {
          return { 
            success: false, 
            message: `Invalid Ghana number: ${phoneNumber}. Only Ghana numbers are allowed (start with 0 or +233).` 
          };
        }
      }

      // Format messages for Hubtel bulk API
      const hubtelMessages = messages.map(msg => ({
        From: msg.from || process.env.HUBTEL_SMS_FROM || 'ThePlug',
        To: msg.to.map(phone => phone.replace(/\D/g, '')), // Convert to digits only
        Body: msg.content
      }));

      // Create Basic Auth header
      const credentials = Buffer.from(`${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`).toString('base64');

      const response = await fetch(this.BULK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({
          Messages: hubtelMessages
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: 'Bulk SMS sent successfully',
          results: result.Messages || []
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to send bulk SMS'
        };
      }
    } catch (error) {
      console.error('Bulk SMS sending error:', error);
      return {
        success: false,
        message: 'Network error occurred while sending bulk SMS'
      };
    }
  }

  static async sendSMS(to: string, content: string, from?: string): Promise<SMSResponse> {
    try {
      // Ghana-only validation: must start with 0 or +233 and be Ghana length
      const normalized = to.trim();
      const isGhanaLocal = /^0\d{9}$/.test(normalized);
      const isGhanaIntl = /^\+233\d{9}$/.test(normalized);
      if (!isGhanaLocal && !isGhanaIntl) {
        return { success: false, message: 'Only Ghana numbers are allowed (start with 0 or +233).' };
      }

      // Convert to digits for Hubtel
      const hubtelTo = normalized.replace(/\D/g, '');

      const params = new URLSearchParams({
        clientid: process.env.HUBTEL_CLIENT_ID!,
        clientsecret: process.env.HUBTEL_CLIENT_SECRET!,
        from: from || process.env.HUBTEL_SMS_FROM || 'ThePlug',
        to: hubtelTo, // digits only
        content: content
      });

      const response = await fetch(`${this.BASE_URL}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: 'SMS sent successfully',
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to send SMS'
        };
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        message: 'Network error occurred while sending SMS'
      };
    }
  }

  // Template messages for e-commerce scenarios
  static getOrderConfirmationMessage(customerName: string, orderNumber: string, total: number, orderId?: string): string {
    const trackingLink = orderId ? ` Track: https://theplugonline.com/orders/${orderId}` : '';
    return `Hi ${customerName}! Your order ${orderNumber} has been confirmed. Total: GHS ${total.toFixed(2)}. We'll notify you when it ships.${trackingLink} Thank you for shopping with ThePlug!`;
  }

  static getOrderShippedMessage(customerName: string, orderNumber: string, trackingNumber?: string, orderId?: string): string {
    const trackingText = trackingNumber ? ` Tracking: ${trackingNumber}` : '';
    const trackingLink = orderId ? ` Track: https://theplugonline.com/orders/${orderId}` : '';
    return `Hi ${customerName}! Your order ${orderNumber} has been shipped and is on its way to you.${trackingText}${trackingLink} Thank you for choosing ThePlug!`;
  }

  static getOrderDeliveredMessage(customerName: string, orderNumber: string, orderId?: string): string {
    const trackingLink = orderId ? ` View: https://theplugonline.com/orders/${orderId}` : '';
    return `Hi ${customerName}! Your order ${orderNumber} has been delivered. We hope you love your purchase! Please leave a review.${trackingLink} - ThePlug`;
  }

  static getOrderCancelledMessage(customerName: string, orderNumber: string, reason?: string, orderId?: string): string {
    const reasonText = reason ? ` Reason: ${reason}` : '';
    const trackingLink = orderId ? ` View: https://theplugonline.com/orders/${orderId}` : '';
    return `Hi ${customerName}, your order ${orderNumber} has been cancelled.${reasonText} Any payment will be refunded within 3-5 business days.${trackingLink} - ThePlug`;
  }

  static getRefundApprovedMessage(customerName: string, orderNumber: string, amount: number): string {
    return `Hi ${customerName}! Your refund for order ${orderNumber} (GHS ${amount.toFixed(2)}) has been approved and will be processed within 3-5 business days. - ThePlug`;
  }

  static getPaymentFailedMessage(customerName: string, orderNumber: string): string {
    return `Hi ${customerName}, payment for order ${orderNumber} failed. Please try again or contact support. Your order is on hold. - ThePlug`;
  }

  static getWelcomeMessage(customerName: string): string {
    return `Welcome to ThePlug, ${customerName}! 🎉 Discover the latest fashion trends and exclusive deals. Start shopping now!`;
  }

  static getPasswordResetMessage(customerName: string, resetCode: string): string {
    return `Hi ${customerName}, your ThePlug password reset code is: ${resetCode}. This code expires in 15 minutes. Don't share this code with anyone.`;
  }

  static getOrderReminderMessage(customerName: string, orderNumber: string, daysWaiting: number): string {
    return `Hi ${customerName}, your order ${orderNumber} has been waiting for ${daysWaiting} days. Complete your payment to avoid cancellation. - ThePlug`;
  }

  static getStockAlertMessage(customerName: string, productName: string): string {
    return `Hi ${customerName}! The item "${productName}" you were interested in is back in stock. Get it before it's gone! - ThePlug`;
  }

  static getPromotionalMessage(customerName: string, discount: number, code?: string): string {
    const codeText = code ? ` Use code: ${code}` : '';
    return `Hi ${customerName}! 🔥 Special offer: ${discount}% off your next purchase!${codeText} Limited time only. Shop now at ThePlug!`;
  }
}
