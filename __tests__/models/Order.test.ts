import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Order, { IOrder, IOrderItem, OrderStatus, PaymentStatus, PaymentMethod } from '../../lib/db/models/Order'

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce-test'
  await mongoose.connect(mongoUri, {
    dbName: 'fashion-ecommerce-test'
  })
}, 30000) // 30 second timeout for database connection

afterAll(async () => {
  await mongoose.connection.close()
}, 30000)

beforeEach(async () => {
  // Clean up the Order collection before each test
  await Order.deleteMany({})
})

describe('Order Model', () => {
  const validOrderData = {
    userId: new mongoose.Types.ObjectId(),
    items: [{
      productId: new mongoose.Types.ObjectId(),
      productName: 'Classic Cotton T-Shirt',
      productImage: 'https://example.com/tshirt.jpg',
      size: 'M',
      color: 'blue',
      quantity: 2,
      unitPrice: 29.99,
      totalPrice: 59.98
    }] as IOrderItem[],
    tax: 5.40,
    shipping: 10.00,
    discount: 0,
    paymentMethod: PaymentMethod.CARD,
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      recipientName: 'John Doe',
      recipientPhone: '+1234567890'
    }
  }

  describe('Order Creation', () => {
    it('should create a valid order', async () => {
      const order = new Order(validOrderData)
      const savedOrder = await order.save()

      expect(savedOrder._id).toBeDefined()
      expect(savedOrder.userId).toEqual(validOrderData.userId)
      expect(savedOrder.items).toHaveLength(1)
      expect(savedOrder.subtotal).toBeCloseTo(59.98, 2)
      expect(savedOrder.tax).toBeCloseTo(5.40, 2)
      expect(savedOrder.shipping).toBeCloseTo(10.00, 2)
      expect(savedOrder.total).toBeCloseTo(75.38, 2) // 59.98 + 5.40 + 10.00
      expect(savedOrder.status).toBe(OrderStatus.PENDING)
      expect(savedOrder.paymentStatus).toBe(PaymentStatus.PENDING)
      expect(savedOrder.orderNumber).toMatch(/^ORD-\d{8}-\d{6}$/)
      expect(savedOrder.createdAt).toBeDefined()
      expect(savedOrder.updatedAt).toBeDefined()
    })

    it('should generate unique order numbers', async () => {
      const order1 = new Order(validOrderData)
      const order2 = new Order({
        ...validOrderData,
        userId: new mongoose.Types.ObjectId()
      })

      const savedOrder1 = await order1.save()
      const savedOrder2 = await order2.save()

      expect(savedOrder1.orderNumber).not.toBe(savedOrder2.orderNumber)
      expect(savedOrder1.orderNumber).toMatch(/^ORD-\d{8}-\d{6}$/)
      expect(savedOrder2.orderNumber).toMatch(/^ORD-\d{8}-\d{6}$/)
    })

    it('should calculate subtotal from items', async () => {
      const orderData = {
        ...validOrderData,
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'T-Shirt',
            productImage: 'https://example.com/tshirt.jpg',
            quantity: 2,
            unitPrice: 25.00,
            totalPrice: 50.00
          },
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Jeans',
            productImage: 'https://example.com/jeans.jpg',
            quantity: 1,
            unitPrice: 75.00,
            totalPrice: 75.00
          }
        ] as IOrderItem[]
      }

      const order = new Order(orderData)
      const savedOrder = await order.save()

      expect(savedOrder.subtotal).toBeCloseTo(125.00, 2) // 50.00 + 75.00
      expect(savedOrder.total).toBeCloseTo(140.40, 2) // 125.00 + 5.40 + 10.00
    })

    it('should calculate total with discount', async () => {
      const orderData = {
        ...validOrderData,
        discount: 15.00
      }

      const order = new Order(orderData)
      const savedOrder = await order.save()

      expect(savedOrder.total).toBeCloseTo(60.38, 2) // 59.98 + 5.40 + 10.00 - 15.00
    })
  })

  describe('Order Validation', () => {
    it('should require userId', async () => {
      const orderData = { ...validOrderData }
      delete (orderData as any).userId

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('User ID is required')
    })

    it('should require at least one item', async () => {
      const orderData = { ...validOrderData, items: [] }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Order must contain at least one item')
    })

    it('should require payment method', async () => {
      const orderData = { ...validOrderData }
      delete (orderData as any).paymentMethod

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Payment method is required')
    })

    it('should require shipping address', async () => {
      const orderData = { ...validOrderData }
      delete (orderData as any).shippingAddress

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Shipping address is required')
    })

    it('should validate payment method enum', async () => {
      const orderData = { ...validOrderData, paymentMethod: 'invalid_method' as PaymentMethod }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow()
    })

    it('should not allow negative subtotal', async () => {
      const orderData = { ...validOrderData, subtotal: -10 }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Subtotal cannot be negative')
    })

    it('should not allow negative tax', async () => {
      const orderData = { ...validOrderData, tax: -5 }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Tax cannot be negative')
    })

    it('should not allow negative shipping', async () => {
      const orderData = { ...validOrderData, shipping: -10 }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Shipping cost cannot be negative')
    })

    it('should not allow negative discount', async () => {
      const orderData = { ...validOrderData, discount: -5 }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Discount cannot be negative')
    })
  })

  describe('Order Items Validation', () => {
    it('should require product ID for items', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Product ID is required')
    })

    it('should require product name for items', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productImage: 'https://example.com/tshirt.jpg',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Product name is required for order history')
    })

    it('should require product image for items', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Product image is required for order history')
    })

    it('should require quantity for items', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          unitPrice: 25.00,
          totalPrice: 25.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Quantity is required')
    })

    it('should require minimum quantity of 1', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          quantity: 0,
          unitPrice: 25.00,
          totalPrice: 0
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Quantity must be at least 1')
    })

    it('should require whole number quantity', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          quantity: 1.5,
          unitPrice: 25.00,
          totalPrice: 37.50
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Quantity must be a whole number')
    })

    it('should validate item total price calculation', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          quantity: 2,
          unitPrice: 25.00,
          totalPrice: 60.00 // Should be 50.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Item total price (60) does not match quantity (2) × unit price (25)')
    })

    it('should normalize size to uppercase and color to lowercase', async () => {
      const orderData = {
        ...validOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          productName: 'T-Shirt',
          productImage: 'https://example.com/tshirt.jpg',
          size: 'xl',
          color: 'NAVY BLUE',
          quantity: 1,
          unitPrice: 25.00,
          totalPrice: 25.00
        }] as IOrderItem[]
      }

      const order = new Order(orderData)
      const savedOrder = await order.save()

      expect(savedOrder.items[0].size).toBe('XL')
      expect(savedOrder.items[0].color).toBe('navy blue')
    })
  })

  describe('Shipping Address Validation', () => {
    it('should require all shipping address fields', async () => {
      const orderData = {
        ...validOrderData,
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
          // Missing recipientName and recipientPhone
        }
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow()
    })

    it('should validate ZIP code format', async () => {
      const orderData = {
        ...validOrderData,
        shippingAddress: {
          ...validOrderData.shippingAddress,
          zipCode: 'invalid'
        }
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Please enter a valid ZIP code')
    })

    it('should validate phone number format', async () => {
      const orderData = {
        ...validOrderData,
        shippingAddress: {
          ...validOrderData.shippingAddress,
          recipientPhone: 'invalid'
        }
      }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow('Please enter a valid phone number')
    })
  })

  describe('Order Status Management', () => {
    it('should set deliveredAt when status changes to delivered', async () => {
      const order = new Order(validOrderData)
      const savedOrder = await order.save()

      expect(savedOrder.deliveredAt).toBeUndefined()

      savedOrder.status = OrderStatus.DELIVERED
      const updatedOrder = await savedOrder.save()

      expect(updatedOrder.deliveredAt).toBeDefined()
      expect(updatedOrder.deliveredAt).toBeInstanceOf(Date)
    })

    it('should set cancelledAt when status changes to cancelled', async () => {
      const order = new Order(validOrderData)
      const savedOrder = await order.save()

      expect(savedOrder.cancelledAt).toBeUndefined()

      savedOrder.status = OrderStatus.CANCELLED
      savedOrder.cancelReason = 'Customer request'
      const updatedOrder = await savedOrder.save()

      expect(updatedOrder.cancelledAt).toBeDefined()
      expect(updatedOrder.cancelledAt).toBeInstanceOf(Date)
      expect(updatedOrder.cancelReason).toBe('Customer request')
    })

    it('should validate order status enum', async () => {
      const orderData = { ...validOrderData, status: 'invalid_status' as OrderStatus }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow()
    })

    it('should validate payment status enum', async () => {
      const orderData = { ...validOrderData, paymentStatus: 'invalid_status' as PaymentStatus }

      const order = new Order(orderData)
      
      await expect(order.save()).rejects.toThrow()
    })
  })

  describe('Order Tracking', () => {
    it('should allow setting tracking number', async () => {
      const order = new Order(validOrderData)
      const savedOrder = await order.save()

      savedOrder.trackingNumber = 'TRK123456789'
      savedOrder.status = OrderStatus.SHIPPED
      const updatedOrder = await savedOrder.save()

      expect(updatedOrder.trackingNumber).toBe('TRK123456789')
    })

    it('should allow setting estimated delivery date', async () => {
      const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      const order = new Order({
        ...validOrderData,
        estimatedDelivery
      })
      const savedOrder = await order.save()

      expect(savedOrder.estimatedDelivery).toEqual(estimatedDelivery)
    })
  })

  describe('Payment Integration', () => {
    it('should allow setting Paystack reference', async () => {
      const order = new Order({
        ...validOrderData,
        paystackReference: 'ps_ref_123456789'
      })
      const savedOrder = await order.save()

      expect(savedOrder.paystackReference).toBe('ps_ref_123456789')
    })

    it('should allow multiple orders with null Paystack reference', async () => {
      const order1 = new Order(validOrderData)
      const order2 = new Order({
        ...validOrderData,
        userId: new mongoose.Types.ObjectId()
      })

      const savedOrder1 = await order1.save()
      const savedOrder2 = await order2.save()

      expect(savedOrder1.paystackReference).toBeUndefined()
      expect(savedOrder2.paystackReference).toBeUndefined()
    })
  })

  describe('Order Calculations', () => {
    it('should handle zero discount correctly', async () => {
      const order = new Order(validOrderData)
      const savedOrder = await order.save()

      expect(savedOrder.discount).toBe(0)
      expect(savedOrder.total).toBeCloseTo(75.38, 2) // 59.98 + 5.40 + 10.00
    })

    it('should prevent negative total', async () => {
      const orderData = {
        ...validOrderData,
        discount: 100.00 // Larger than subtotal + tax + shipping
      }

      const order = new Order(orderData)
      const savedOrder = await order.save()

      expect(savedOrder.total).toBe(0) // Should be clamped to 0
    })
  })
})