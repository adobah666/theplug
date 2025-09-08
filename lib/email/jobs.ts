import { emailNotificationService } from './notifications';
import { OrderStatus } from '@/lib/db/models/Order';

export class EmailJobService {
  /**
   * Schedule review request emails for delivered orders
   * This should be called when an order status changes to DELIVERED
   */
  async scheduleReviewRequestForOrder(orderId: string, delayHours: number = 72): Promise<void> {
    try {
      const { getOrderById } = await import('@/lib/orders/service');
      const User = (await import('@/lib/db/models/User')).default;
      
      // Get order details
      const order = await getOrderById(orderId);
      if (!order || order.status !== OrderStatus.DELIVERED) {
        console.warn(`Cannot schedule review request for order ${orderId}: order not found or not delivered`);
        return;
      }

      // Get user details
      const user = await User.findById(order.userId);
      if (!user) {
        console.warn(`Cannot schedule review request for order ${orderId}: user not found`);
        return;
      }

      // Schedule review request email
      await emailNotificationService.queueReviewRequest(user.email, {
        customerName: `${user.firstName} ${user.lastName}`,
        orderNumber: order.orderNumber,
        items: order.items.map(item => ({
          name: item.productName,
          image: item.productImage,
          reviewUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/products/${item.productId}?review=true`
        }))
      }, delayHours);

      console.log(`Review request scheduled for order ${orderId} (${delayHours} hours delay)`);
    } catch (error) {
      console.error(`Failed to schedule review request for order ${orderId}:`, error);
    }
  }

  /**
   * Send bulk promotional emails
   */
  async sendPromotionalEmail(
    userEmails: string[], 
    subject: string, 
    htmlContent: string, 
    textContent: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const batchSize = 50; // SES limit
    
    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize);
      
      try {
        const { emailService } = await import('./service');
        await emailService.sendEmail({
          to: batch,
          subject,
          html: htmlContent,
          text: textContent
        });
        success += batch.length;
      } catch (error) {
        console.error(`Failed to send promotional email batch ${i / batchSize + 1}:`, error);
        failed += batch.length;
      }
    }

    return { success, failed };
  }

  /**
   * Send abandoned cart reminder emails
   */
  async sendAbandonedCartReminders(): Promise<void> {
    try {
      const User = (await import('@/lib/db/models/User')).default;
      
      // Find users with items in cart but no recent orders (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const usersWithAbandonedCarts = await User.find({
        'cart.0': { $exists: true }, // Has at least one cart item
        lastLogin: { $gte: twentyFourHoursAgo }, // Was active recently
        // Add additional filters to avoid spamming users
      }).select('email firstName lastName cart');

      for (const user of usersWithAbandonedCarts) {
        try {
          const { emailService } = await import('./service');
          
          await emailService.sendEmail({
            to: user.email,
            subject: 'Don\'t forget your items!',
            html: this.generateAbandonedCartEmailHTML(user),
            text: this.generateAbandonedCartEmailText(user)
          });
          
          console.log(`Abandoned cart reminder sent to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send abandoned cart reminder to ${user.email}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to send abandoned cart reminders:', error);
    }
  }

  private generateAbandonedCartEmailHTML(user: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Don't forget your items!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Don't forget your items!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>You left ${user.cart.length} item${user.cart.length > 1 ? 's' : ''} in your cart. Complete your purchase before they're gone!</p>
              
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cart" class="button">Complete Your Purchase</a>
              
              <p>Need help? Our customer support team is here to assist you.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateAbandonedCartEmailText(user: any): string {
    return `
      Don't forget your items!
      
      Hi ${user.firstName},
      
      You left ${user.cart.length} item${user.cart.length > 1 ? 's' : ''} in your cart. Complete your purchase before they're gone!
      
      Complete your purchase: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cart
      
      Need help? Our customer support team is here to assist you.
    `;
  }
}

export const emailJobService = new EmailJobService();