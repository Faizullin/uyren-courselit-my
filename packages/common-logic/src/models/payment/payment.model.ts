import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../../lib/organization";
import { IPayment, PaymentMethodEnum, PaymentStatusEnum } from "./payment.types";

export const PaymentSchema = new mongoose.Schema<IPayment>({
  orgId: orgaizationIdField(),
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
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
  processorTransactionId: {
    type: String,
    required: false,
    index: true,
  },
  processorSessionId: {
    type: String,
    required: false,
  },
  processedAt: {
    type: Date,
    required: false,
  },
  failedAt: {
    type: Date,
    required: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
}, {
  timestamps: true,
});

PaymentSchema.index({ orgId: 1, status: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

PaymentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

PaymentSchema.virtual('invoice', {
  ref: 'Invoice',
  localField: 'invoiceId',
  foreignField: '_id',
  justOne: true,
});

export const PaymentModel = createModel('Payment', PaymentSchema);
export type IPaymentHydratedDocument = HydratedDocument<IPayment>;

