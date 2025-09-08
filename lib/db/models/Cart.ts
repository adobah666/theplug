import mongoose, { Document, Schema } from 'mongoose'

// Cart item interface
export interface ICartItem {
  _id?: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  variantId?: string
  quantity: number
  price: number
  name: string // Snapshot for display
  image: string // First product image
  size?: string
  color?: string
}

// Cart interface extending Document
export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId // Optional for guest carts
  sessionId?: string // For guest users
  items: ICartItem[]
  subtotal: number
  itemCount: number
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

// Cart item subdocument schema
const CartItemSchema = new Schema<ICartItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  variantId: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Quantity cannot exceed 99']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Product image is required']
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
  }
})

// Cart schema
const CartSchema = new Schema<ICart>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Allows null values and creates sparse index
  },
  sessionId: {
    type: String,
    trim: true,
    sparse: true // For guest users
  },
  items: [CartItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  itemCount: {
    type: Number,
    default: 0,
    min: [0, 'Item count cannot be negative']
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: true
})

// Pre-save middleware to calculate subtotal and item count
CartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0)
  this.itemCount = this.items.reduce((total, item) => total + item.quantity, 0)
  next()
})

// Validation to ensure either userId or sessionId is provided
CartSchema.pre('save', function(next) {
  if (!this.userId && !this.sessionId) {
    return next(new Error('Either userId or sessionId must be provided'))
  }
  next()
})

// Index for better query performance
CartSchema.index({ userId: 1 })
CartSchema.index({ sessionId: 1 })
CartSchema.index({ updatedAt: -1 })

// Create and export the model
const Cart = mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema)

export default Cart