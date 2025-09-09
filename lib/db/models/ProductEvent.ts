import mongoose, { Schema, Document } from 'mongoose'

export type ProductEventType = 'view' | 'add_to_cart' | 'purchase'

export interface IProductEvent extends Document {
  productId: mongoose.Types.ObjectId
  type: ProductEventType
  quantity?: number
  userId?: mongoose.Types.ObjectId
  createdAt: Date
}

const ProductEventSchema = new Schema<IProductEvent>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: { type: String, enum: ['view', 'add_to_cart', 'purchase'], required: true, index: true },
  quantity: { type: Number, default: 1, min: [1, 'Quantity must be at least 1'] },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } })

ProductEventSchema.index({ createdAt: -1 })

const ProductEvent = mongoose.models.ProductEvent || mongoose.model<IProductEvent>('ProductEvent', ProductEventSchema)
export default ProductEvent
