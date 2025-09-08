import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

// Address subdocument interface
export interface IAddress {
  id: string
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

// Wishlist item interface
export interface IWishlistItem {
  id: string
  productId: string
  addedAt: Date
}

// Cart item interface
export interface ICartItem {
  id: string
  productId: string
  quantity: number
  variant?: {
    size?: string
    color?: string
  }
  addedAt: Date
}

// User interface extending Document
export interface IUser extends Document {
  email: string
  firstName: string
  lastName: string
  phone?: string
  password: string
  addresses?: IAddress[]
  wishlist?: IWishlistItem[]
  cart?: ICartItem[]
  emailVerified: boolean
  resetToken?: string
  resetTokenExpiry?: Date
  createdAt: Date
  lastLogin?: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

// Address subdocument schema
const AddressSchema = new Schema<IAddress>({
  id: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
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
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
})

// Wishlist item schema
const WishlistItemSchema = new Schema<IWishlistItem>({
  id: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
})

// Cart item schema
const CartItemSchema = new Schema<ICartItem>({
  id: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  variant: {
    size: String,
    color: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
})

// User schema
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ]
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  addresses: [AddressSchema],
  wishlist: [WishlistItemSchema],
  cart: [CartItemSchema],
  emailVerified: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String,
    select: false
  },
  resetTokenExpiry: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next()

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error('Password comparison failed')
  }
}

// Ensure only one default address per user
UserSchema.pre('save', function(next) {
  if (this.addresses && this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault)
    
    // If more than one default address, keep only the first one
    if (defaultAddresses.length > 1) {
      this.addresses.forEach((addr, index) => {
        if (index > 0 && addr.isDefault) {
          addr.isDefault = false
        }
      })
    }
  }
  next()
})

// Create and export the model
// In development, Next.js hot reloading can keep an old cached model with an outdated schema.
// To prevent validation mismatches (e.g., expecting a `name` field from an older schema),
// delete the cached model in development so we always use the current schema.
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models: any = mongoose.models
    if (models && models.User) {
      delete models.User
    }
  } catch {
    // noop
  }
}

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User