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
    required: [true, 'Category slug is required'],
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

// Pre-save middleware to generate slug from name if not provided
CategorySchema.pre('save', function(next) {
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

// Index for better query performance
CategorySchema.index({ parentCategory: 1 })
CategorySchema.index({ isActive: 1 })

// Create and export the model
const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema)

export default Category