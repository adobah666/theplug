import mongoose, { Document, Schema } from 'mongoose'

export type RefundStatus = 'pending' | 'approved' | 'rejected'

export interface IRefundRequest extends Document {
  orderId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  reason?: string
  status: RefundStatus
  createdAt: Date
  updatedAt: Date
}

const RefundRequestSchema = new Schema<IRefundRequest>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true })

RefundRequestSchema.index({ orderId: 1, userId: 1 }, { unique: true })

const RefundRequest = mongoose.models.RefundRequest || mongoose.model<IRefundRequest>('RefundRequest', RefundRequestSchema)
export default RefundRequest
