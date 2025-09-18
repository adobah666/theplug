import mongoose, { Document, Schema } from 'mongoose';

export enum SMSQueueStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum SMSType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ORDER_REMINDER = 'ORDER_REMINDER',
  STOCK_ALERT = 'STOCK_ALERT',
  PROMOTIONAL = 'PROMOTIONAL',
  MANUAL = 'MANUAL'
}

export interface ISMSQueue extends Document {
  id: string;
  phoneNumber: string;
  content: string;
  type: SMSType;
  recipientId?: string | null;
  fromName?: string | null;
  sentBy?: string | null;
  priority: number;
  scheduledAt: Date;
  status: SMSQueueStatus;
  retryCount: number;
  maxRetries: number;
  sentAt?: Date;
  messageId?: string;
  lastError?: string;
  orderId?: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SMSQueueSchema = new Schema<ISMSQueue>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'SMS content cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: Object.values(SMSType),
    required: true,
    default: SMSType.MANUAL
  },
  recipientId: {
    type: String,
    default: null
  },
  fromName: {
    type: String,
    trim: true,
    maxlength: [11, 'SMS sender name cannot exceed 11 characters']
  },
  sentBy: {
    type: String,
    default: null
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
    default: 2
  },
  scheduledAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(SMSQueueStatus),
    required: true,
    default: SMSQueueStatus.PENDING
  },
  retryCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maxRetries: {
    type: Number,
    required: true,
    min: 0,
    default: 3
  },
  sentAt: {
    type: Date
  },
  messageId: {
    type: String,
    trim: true
  },
  lastError: {
    type: String,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  orderId: {
    type: String,
    default: null
  },
  userId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SMSQueueSchema.index({ status: 1, scheduledAt: 1 });
SMSQueueSchema.index({ phoneNumber: 1 });
SMSQueueSchema.index({ type: 1 });
SMSQueueSchema.index({ orderId: 1 });
SMSQueueSchema.index({ userId: 1 });
SMSQueueSchema.index({ priority: 1, scheduledAt: 1 });

const SMSQueue = mongoose.models.SMSQueue || mongoose.model<ISMSQueue>('SMSQueue', SMSQueueSchema);

export default SMSQueue;
