export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface OrderConfirmationData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingUrl?: string;
}

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresIn: string;
}

export interface WelcomeEmailData {
  customerName: string;
  email: string;
  loginUrl: string;
}

export interface OrderStatusData {
  customerName: string;
  orderNumber: string;
  status: string;
  statusMessage: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface ReviewRequestData {
  customerName: string;
  orderNumber: string;
  items: Array<{
    name: string;
    image?: string;
    reviewUrl: string;
  }>;
}

export const emailTemplates = {
  orderConfirmation: (data: OrderConfirmationData): EmailTemplate => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-item { border-bottom: 1px solid #ddd; padding: 15px 0; }
            .total-row { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
            .button { background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.customerName},</h2>
              <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
              
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${data.orderNumber}</p>
              <p><strong>Order Date:</strong> ${data.orderDate}</p>
              
              <h3>Items Ordered</h3>
              ${data.items.map(item => `
                <div class="order-item">
                  <strong>${item.name}</strong><br>
                  Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
                </div>
              `).join('')}
              
              <div style="margin-top: 20px;">
                <div>Subtotal: $${data.subtotal.toFixed(2)}</div>
                <div>Shipping: $${data.shipping.toFixed(2)}</div>
                <div>Tax: $${data.tax.toFixed(2)}</div>
                <div class="total-row">Total: $${data.total.toFixed(2)}</div>
              </div>
              
              <h3>Shipping Address</h3>
              <p>
                ${data.shippingAddress.name}<br>
                ${data.shippingAddress.street}<br>
                ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}<br>
                ${data.shippingAddress.country}
              </p>
              
              ${data.trackingUrl ? `<a href="${data.trackingUrl}" class="button">Track Your Order</a>` : ''}
              
              <p>We'll send you another email when your order ships with tracking information.</p>
              <p>Thank you for shopping with us!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Order Confirmed!
      
      Hi ${data.customerName},
      
      Thank you for your order! We've received your order and are preparing it for shipment.
      
      Order Details:
      Order Number: ${data.orderNumber}
      Order Date: ${data.orderDate}
      
      Items Ordered:
      ${data.items.map(item => `${item.name} - Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`).join('\n')}
      
      Subtotal: $${data.subtotal.toFixed(2)}
      Shipping: $${data.shipping.toFixed(2)}
      Tax: $${data.tax.toFixed(2)}
      Total: $${data.total.toFixed(2)}
      
      Shipping Address:
      ${data.shippingAddress.name}
      ${data.shippingAddress.street}
      ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}
      ${data.shippingAddress.country}
      
      ${data.trackingUrl ? `Track your order: ${data.trackingUrl}` : ''}
      
      We'll send you another email when your order ships with tracking information.
      Thank you for shopping with us!
    `
  }),

  passwordReset: (data: PasswordResetData): EmailTemplate => ({
    subject: 'Reset Your Password - The Plug Fashion',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.customerName},</h2>
              <p>We received a request to reset your password for your The Plug Fashion account.</p>
              
              <a href="${data.resetUrl}" class="button">Reset Your Password</a>
              
              <div class="warning">
                <strong>Important:</strong> This link will expire in ${data.expiresIn}. If you didn't request this password reset, please ignore this email.
              </div>
              
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p>${data.resetUrl}</p>
              
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${data.customerName},
      
      We received a request to reset your password for your The Plug Fashion account.
      
      Reset your password by clicking this link: ${data.resetUrl}
      
      Important: This link will expire in ${data.expiresIn}. If you didn't request this password reset, please ignore this email.
      
      If you have any questions, please contact our support team.
    `
  }),

  welcome: (data: WelcomeEmailData): EmailTemplate => ({
    subject: 'Welcome to The Plug Fashion!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to The Plug Fashion</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            .features { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
            .feature { flex: 1; min-width: 200px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to The Plug Fashion!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.customerName},</h2>
              <p>Welcome to The Plug Fashion! We're excited to have you join our community of fashion enthusiasts.</p>
              
              <p>Your account has been created with the email: <strong>${data.email}</strong></p>
              
              <a href="${data.loginUrl}" class="button">Start Shopping</a>
              
              <h3>What's Next?</h3>
              <div class="features">
                <div class="feature">
                  <h4>🛍️ Browse Collections</h4>
                  <p>Discover our latest fashion trends and exclusive pieces</p>
                </div>
                <div class="feature">
                  <h4>❤️ Create Wishlist</h4>
                  <p>Save your favorite items for later</p>
                </div>
                <div class="feature">
                  <h4>🚚 Fast Shipping</h4>
                  <p>Enjoy quick delivery on all orders</p>
                </div>
              </div>
              
              <p>If you have any questions, our customer support team is here to help!</p>
              <p>Happy shopping!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to The Plug Fashion!
      
      Hi ${data.customerName},
      
      Welcome to The Plug Fashion! We're excited to have you join our community of fashion enthusiasts.
      
      Your account has been created with the email: ${data.email}
      
      Start shopping: ${data.loginUrl}
      
      What's Next?
      - Browse our latest fashion collections
      - Create a wishlist of your favorite items
      - Enjoy fast shipping on all orders
      
      If you have any questions, our customer support team is here to help!
      Happy shopping!
    `
  }),

  orderStatusUpdate: (data: OrderStatusData): EmailTemplate => ({
    subject: `Order Update - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
            .button { background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.customerName},</h2>
              <p>We have an update on your order <strong>${data.orderNumber}</strong>.</p>
              
              <div class="status">
                <h3>Status: ${data.status}</h3>
                <p>${data.statusMessage}</p>
              </div>
              
              ${data.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
              
              ${data.trackingUrl ? `<a href="${data.trackingUrl}" class="button">Track Your Order</a>` : ''}
              
              <p>Thank you for your patience and for choosing The Plug Fashion!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Order Status Update
      
      Hi ${data.customerName},
      
      We have an update on your order ${data.orderNumber}.
      
      Status: ${data.status}
      ${data.statusMessage}
      
      ${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}
      
      ${data.trackingUrl ? `Track your order: ${data.trackingUrl}` : ''}
      
      Thank you for your patience and for choosing The Plug Fashion!
    `
  }),

  reviewRequest: (data: ReviewRequestData): EmailTemplate => ({
    subject: `How was your recent order? - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Review Your Recent Purchase</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .product-item { border-bottom: 1px solid #ddd; padding: 15px 0; display: flex; align-items: center; gap: 15px; }
            .button { background: #000; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>How was your recent order?</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.customerName},</h2>
              <p>We hope you're loving your recent purchase from order <strong>${data.orderNumber}</strong>!</p>
              
              <p>Your feedback helps other customers make informed decisions and helps us improve our products and service.</p>
              
              <h3>Items to Review:</h3>
              ${data.items.map(item => `
                <div class="product-item">
                  ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">` : ''}
                  <div style="flex: 1;">
                    <strong>${item.name}</strong>
                    <br>
                    <a href="${item.reviewUrl}" class="button">Write Review</a>
                  </div>
                </div>
              `).join('')}
              
              <p>Thank you for choosing The Plug Fashion!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      How was your recent order?
      
      Hi ${data.customerName},
      
      We hope you're loving your recent purchase from order ${data.orderNumber}!
      
      Your feedback helps other customers make informed decisions and helps us improve our products and service.
      
      Items to Review:
      ${data.items.map(item => `${item.name} - Review at: ${item.reviewUrl}`).join('\n')}
      
      Thank you for choosing The Plug Fashion!
    `
  })
};