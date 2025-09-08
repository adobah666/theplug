import mongoose, { Document, Schema } from 'mongoose'

// Category interface extending Document
export interface ICategory extends Document {
  name: string
  description?: string
  slug: string
  parentCategory?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Category schema
const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Category description cannot exceed 500 characters']
  },
  slug: {
    type: String,
    // Not strictly required; we'll auto-generate from name
    required: false,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Ensure slug is generated before validation if missing
CategorySchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }
  next()
})

// Also keep post-validate save hook for any cases where slug might still be empty in updates
CategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
  next()
})

// Index for better query performance
CategorySchema.index({ parentCategory: 1 })
CategorySchema.index({ isActive: 1 })

// In development, clear cached model to avoid schema mismatch during HMR
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models: any = mongoose.models
    if (models && models.Category) {
      delete models.Category
    }
  } catch {
    // no-op
  }
}

// Create and export the model
const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema)

export default Category