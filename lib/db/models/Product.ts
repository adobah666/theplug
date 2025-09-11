import mongoose, { Document, Schema } from 'mongoose'
import { indexProduct, removeProductFromIndex } from '../../meilisearch/indexing'

// Product variant interface
export interface IProductVariant {
  _id?: mongoose.Types.ObjectId
  size?: string
  color?: string
  sku: string
  price?: number
  inventory: number
}

// Product interface extending Document
export interface IProduct extends Document {
  name: string
  description: string
  price: number
  images: string[]
  category: mongoose.Types.ObjectId
  brand: string
  variants: IProductVariant[]
  inventory: number
  rating: number
  reviewCount: number
  searchableText: string
  createdAt: Date
  updatedAt: Date
  // Analytics counters
  views: number
  addToCartCount: number
  purchaseCount: number
  popularityScore: number
}

// Product variant subdocument schema
const ProductVariantSchema = new Schema<IProductVariant>({
  size: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Size cannot exceed 10 characters']
  },
  color: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Color name cannot exceed 50 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required for variant'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9\-_]{3,20}$/, 'SKU must be 3-20 characters with letters, numbers, hyphens, or underscores']
  },
  price: {
    type: Number,
    min: [0, 'Variant price cannot be negative'],
    validate: {
      validator: function(value: number) {
        return value == null || value >= 0
      },
      message: 'Variant price must be a positive number'
    }
  },
  inventory: {
    type: Number,
    required: [true, 'Inventory is required for variant'],
    min: [0, 'Inventory cannot be negative'],
    default: 0
  }
})

// Product schema
const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters long'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [2000, 'Product description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  images: {
    type: [String],
    required: [true, 'At least one product image is required'],
    validate: {
      validator: function(images: string[]) {
        return images && images.length > 0 && images.length <= 10
      },
      message: 'Product must have between 1 and 10 images'
    }
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    required: [true, 'Product brand is required'],
    trim: true,
    minlength: [2, 'Brand name must be at least 2 characters long'],
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  variants: [ProductVariantSchema],
  inventory: {
    type: Number,
    required: [true, 'Product inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  reviewCount: {
    type: Number,
    min: [0, 'Review count cannot be negative'],
    default: 0
  },
  searchableText: {
    type: String,
    index: 'text' // Text index for search functionality
  },
  // Analytics counters
  views: { type: Number, default: 0, min: [0, 'Views cannot be negative'] },
  addToCartCount: { type: Number, default: 0, min: [0, 'Add to cart count cannot be negative'] },
  purchaseCount: { type: Number, default: 0, min: [0, 'Purchase count cannot be negative'] },
  popularityScore: { type: Number, default: 0, min: [0, 'Popularity score cannot be negative'] }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
})

// Pre-save middleware to generate searchable text
ProductSchema.pre('save', function(next) {
  // Create searchable text from name, description, brand, and variant info
  const variantText = this.variants.map(v => `${v.size || ''} ${v.color || ''}`).join(' ')
  const desc = (this as any).description || ''
  this.searchableText = `${this.name} ${desc} ${this.brand} ${variantText}`.toLowerCase()
  next()
})

// Pre-save middleware to validate variants
ProductSchema.pre('save', function(next) {
  // Ensure SKUs are unique within the product
  if (this.variants && this.variants.length > 0) {
    const skus = this.variants.map(v => v.sku)
    const uniqueSkus = new Set(skus)
    
    if (skus.length !== uniqueSkus.size) {
      return next(new Error('All variant SKUs must be unique within a product'))
    }
  }
  next()
})

// Pre-save middleware to calculate total inventory
ProductSchema.pre('save', function(next) {
  // If product has variants, calculate total inventory from variants
  if (this.variants && this.variants.length > 0) {
    this.inventory = this.variants.reduce((total, variant) => total + variant.inventory, 0)
  }
  next()
})

// Post-save middleware to update Meilisearch index
ProductSchema.post('save', async function(doc) {
  try {
    // Ensure category is populated to extract slug for indexing
    const populatedDoc = await doc.populate({ path: 'category', select: 'slug name' })
    await indexProduct(populatedDoc as any)
  } catch (error) {
    console.error('Error updating Meilisearch index after save:', error)
    // Don't throw error to avoid breaking the save operation
  }
})

// Post-update middleware to update Meilisearch index when using findOneAndUpdate
ProductSchema.post('findOneAndUpdate', async function(result) {
  try {
    if (result) {
      const populated = await (result as any).populate({ path: 'category', select: 'slug name' })
      await indexProduct(populated as any)
    } else {
      // Fallback: try to fetch the updated document by query
      const query = this.getQuery()
      if (query && query._id) {
        const updated = await (this as any).model.findById(query._id).populate({ path: 'category', select: 'slug name' })
        if (updated) {
          await indexProduct(updated as any)
        }
      }
    }
  } catch (error) {
    console.error('Error updating Meilisearch index after findOneAndUpdate:', error)
  }
})

// Post-update middleware for updateOne (query middleware)
ProductSchema.post('updateOne', async function() {
  try {
    const query = this.getQuery()
    if (query && query._id) {
      const updated = await (this as any).model.findById(query._id).populate({ path: 'category', select: 'slug name' })
      if (updated) {
        await indexProduct(updated as any)
      }
    }
  } catch (error) {
    console.error('Error updating Meilisearch index after updateOne:', error)
  }
})

// Post-remove middleware to remove from Meilisearch index
ProductSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      await removeProductFromIndex(doc._id.toString())
    } catch (error) {
      console.error('Error removing from Meilisearch index after delete:', error)
      // Don't throw error to avoid breaking the delete operation
    }
  }
})

// Post-delete middleware for deleteOne (query middleware)
ProductSchema.post('deleteOne', { document: false, query: true } as any, async function() {
  try {
    const query = this.getQuery()
    if (query && query._id) {
      await removeProductFromIndex(query._id.toString())
    }
  } catch (error) {
    console.error('Error removing from Meilisearch index after deleteOne:', error)
  }
})

// Index for better query performance
ProductSchema.index({ category: 1, brand: 1 })
ProductSchema.index({ price: 1 })
ProductSchema.index({ rating: -1 })
ProductSchema.index({ createdAt: -1 })
ProductSchema.index({ 'variants.sku': 1 })
// Analytics related indexes
ProductSchema.index({ views: -1 })
ProductSchema.index({ addToCartCount: -1 })
ProductSchema.index({ purchaseCount: -1 })
ProductSchema.index({ popularityScore: -1 })

// In development, Next.js hot reloading can keep an old cached model with an outdated schema.
// To prevent validation mismatches, delete the cached model in development so we always use the current schema.
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models: any = mongoose.models
    if (models && models.Product) {
      delete models.Product
    }
  } catch {
    // noop
  }
}

// Create and export the model
const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)

export default Product