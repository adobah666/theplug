import mongoose, { Document, Schema } from 'mongoose'

// Order status enum
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

// Payment method enum
export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  CASH_ON_DELIVERY = 'cash_on_delivery'
}

// Shipping address interface
export interface IShippingAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  recipientName: string
  recipientPhone: string
}

// Order item interface
export interface IOrderItem {
  _id?: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  variantId?: string
  productName: string // Snapshot for order history
  productImage: string // Snapshot for order history
  size?: string
  color?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

// Payment details interface
export interface IPaymentDetails {
  authorizationCode?: string
  gatewayResponse?: string
  paidAt?: Date
  failedAt?: Date
  failureReason?: string
  channel?: string
  fees?: number
}

// Order interface extending Document
export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId
  orderNumber: string
  items: IOrderItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  paystackReference?: string
  paymentDetails?: IPaymentDetails
  paidAt?: Date
  shippingAddress: IShippingAddress
  trackingNumber?: string
  estimatedDelivery?: Date
  deliveredAt?: Date
  cancelledAt?: Date
  cancelReason?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Shipping address schema
const ShippingAddressSchema = new Schema<IShippingAddress>({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State name cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  recipientName: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true,
    maxlength: [100, 'Recipient name cannot exceed 100 characters']
  },
  recipientPhone: {
    type: String,
    required: [true, 'Recipient phone is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  }
}, { _id: false })

// Order item subdocument schema
const OrderItemSchema = new Schema<IOrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  variantId: {
    type: String,
    trim: true
  },
  productName: {
    type: String,
    required: [true, 'Product name is required for order history'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  productImage: {
    type: String,
    required: [true, 'Product image is required for order history'],
    trim: true
  },
  size: {
    type: String,
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  }
})

// Order schema
const OrderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  orderNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  items: {
    type: [OrderItemSchema],
    required: [true, 'Order must have at least one item'],
    validate: {
      validator: function(items: IOrderItem[]) {
        return items && items.length > 0
      },
      message: 'Order must contain at least one item'
    }
  },
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  tax: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax cannot be negative'],
    default: 0
  },
  shipping: {
    type: Number,
    required: [true, 'Shipping cost is required'],
    min: [0, 'Shipping cost cannot be negative'],
    default: 0
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    default: 0
  },
  total: {
    type: Number,
    min: [0, 'Total cannot be negative'],
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    required: [true, 'Order status is required']
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: [true, 'Payment status is required']
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: [true, 'Payment method is required']
  },
  paystackReference: {
    type: String,
    trim: true
  },
  paymentDetails: {
    authorizationCode: {
      type: String,
      trim: true
    },
    gatewayResponse: {
      type: String,
      trim: true
    },
    paidAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    failureReason: {
      type: String,
      trim: true
    },
    channel: {
      type: String,
      trim: true
    },
    fees: {
      type: Number,
      min: [0, 'Fees cannot be negative']
    }
  },
  paidAt: {
    type: Date
  },
  shippingAddress: {
    type: ShippingAddressSchema,
    required: [true, 'Shipping address is required']
  },
  trackingNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancel reason cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Pre-save middleware to generate order number
OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    // Generate order number: ORD-YYYYMMDD-XXXXXX (random 6 digits)
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(100000 + Math.random() * 900000)
    this.orderNumber = `ORD-${date}-${random}`
  }
  next()
})

// Pre-save middleware to calculate totals
OrderSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0)
  
  // Calculate total
  this.total = this.subtotal + this.tax + this.shipping - this.discount
  
  // Ensure total is not negative
  if (this.total < 0) {
    this.total = 0
  }
  
  next()
})

// Pre-save middleware to validate item totals
OrderSchema.pre('save', function(next) {
  // Validate that each item's total price matches quantity * unit price
  for (const item of this.items) {
    const expectedTotal = item.quantity * item.unitPrice
    if (Math.abs(item.totalPrice - expectedTotal) > 0.01) { // Allow for small floating point differences
      return next(new Error(`Item total price (${item.totalPrice}) does not match quantity (${item.quantity}) × unit price (${item.unitPrice})`))
    }
  }
  next()
})

// Pre-save middleware to set status-related timestamps
OrderSchema.pre('save', function(next) {
  // Set deliveredAt when status changes to delivered
  if (this.status === OrderStatus.DELIVERED && !this.deliveredAt) {
    this.deliveredAt = new Date()
  }
  
  // Set cancelledAt when status changes to cancelled
  if (this.status === OrderStatus.CANCELLED && !this.cancelledAt) {
    this.cancelledAt = new Date()
  }
  
  next()
})

// Index for better query performance
OrderSchema.index({ userId: 1, createdAt: -1 })
OrderSchema.index({ orderNumber: 1 }, { unique: true })
OrderSchema.index({ status: 1 })
OrderSchema.index({ paymentStatus: 1 })
OrderSchema.index({ paystackReference: 1 }, { sparse: true })
OrderSchema.index({ trackingNumber: 1 })

// Create and export the model
const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order