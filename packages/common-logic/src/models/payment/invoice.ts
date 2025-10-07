import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField, IEntity } from "../../lib/entity";
import { orgaizationIdField } from "../organization";
import { PaymentMethodEnum } from "./payment";

export enum InvoiceStatusEnum {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export interface IInvoice {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paymentPlanId: mongoose.Types.ObjectId;
  entity: IEntity;
  amount: number;
  currency: string;
  status: InvoiceStatusEnum;
  paymentMethod: string;
  processorTransactionId?: string;
  dueDate?: Date;
  paidAt?: Date;
  failedAt?: Date;
}

export const InvoiceSchema = new mongoose.Schema<IInvoice>({
  orgId: orgaizationIdField(),

  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  paymentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PaymentPlan",
    required: true,
    index: true,
  },
  entity: entityField(),
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
    enum: InvoiceStatusEnum,
    default: InvoiceStatusEnum.PENDING,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: PaymentMethodEnum,
  },
  processorTransactionId: {
    type: String,
    required: false,
  },

  // Dates
  dueDate: {
    type: Date,
    required: false,
  },
  paidAt: {
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
InvoiceSchema.index({ orgId: 1, status: 1 });
InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ paymentPlanId: 1 });
InvoiceSchema.index({ createdAt: -1 });

// Virtual for user
InvoiceSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for payment plan
InvoiceSchema.virtual('paymentPlan', {
  ref: 'PaymentPlan',
  localField: 'paymentPlanId',
  foreignField: '_id',
  justOne: true,
});


export const InvoiceModel = createModel('Invoice', InvoiceSchema);
export type IInvoiceHydratedDocument = HydratedDocument<IInvoice>;