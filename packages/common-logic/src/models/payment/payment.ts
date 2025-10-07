import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField, IEntity } from "../../lib/entity";
import { orgaizationIdField } from "../organization";

export enum PaymentMethodEnum {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  RAZORPAY = "razorpay",
  PAYTM = "paytm",
  LEMONSQUEEZY = "lemonsqueezy",
  BANK_TRANSFER = "bank_transfer",
  CASH = "cash",
}

export enum PaymentStatusEnum {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

interface IPayment {
  orgId: mongoose.Types.ObjectId;
  paymentId: string;

  // References
  userId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  entity: IEntity;

  // Payment details
  amount: number;
  currency: string;
  status: PaymentStatusEnum;
  method: PaymentMethodEnum;

  // Payment processor details
  processorTransactionId?: string;
  processorSessionId?: string;

  // Dates
  processedAt?: Date;
  failedAt?: Date;
}

export const PaymentSchema = new mongoose.Schema<IPayment>({
  orgId: orgaizationIdField(),
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true,
    index: true,
  },
  entity: entityField(),

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    length: 3,
    default: "USD",
  },
  status: {
    type: String,
    required: true,
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
    index: true,
  },
  method: {
    type: String,
    required: true,
    enum: PaymentMethodEnum,
    index: true,
  },

  // Payment processor details
  processorTransactionId: {
    type: String,
    required: false,
    index: true,
  },
  processorSessionId: {
    type: String,
    required: false,
  },

  // Dates
  processedAt: {
    type: Date,
    required: false,
  },
  failedAt: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
});

// Indexes
PaymentSchema.index({ orgId: 1, status: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ processorTransactionId: 1 });
PaymentSchema.index({ createdAt: -1 });

// Virtual for user
PaymentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for invoice
PaymentSchema.virtual('invoice', {
  ref: 'Invoice',
  localField: 'invoiceId',
  foreignField: '_id',
  justOne: true,
});

export const PaymentModel = createModel('Payment', PaymentSchema);
export type IPaymentHydratedDocument = HydratedDocument<IPayment>;