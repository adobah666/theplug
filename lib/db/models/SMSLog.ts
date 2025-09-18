import mongoose, { Document, Schema } from 'mongoose';

export enum SMSLogStatus {
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export enum SMSLogType {
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

export interface ISMSLog extends Document {
  phoneNumber: string;
  content: string;
  type: SMSLogType;
  status: SMSLogStatus;
  sentBy?: string | null;
  recipientId?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;
  orderId?: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SMSLogSchema = new Schema<ISMSLog>({
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
    enum: Object.values(SMSLogType),
    required: true,
    default: SMSLogType.MANUAL
  },
  status: {
    type: String,
    enum: Object.values(SMSLogStatus),
    required: true
  },
  sentBy: {
    type: String,
    default: null
  },
  recipientId: {
    type: String,
    default: null
  },
  messageId: {
    type: String,
    trim: true,
    default: null
  },
  errorMessage: {
    type: String,
    maxlength: [500, 'Error message cannot exceed 500 characters'],
    default: null
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
SMSLogSchema.index({ phoneNumber: 1 });
SMSLogSchema.index({ type: 1 });
SMSLogSchema.index({ status: 1 });
SMSLogSchema.index({ orderId: 1 });
SMSLogSchema.index({ userId: 1 });
SMSLogSchema.index({ createdAt: -1 });

const SMSLog = mongoose.models.SMSLog || mongoose.model<ISMSLog>('SMSLog', SMSLogSchema);

export default SMSLog;
