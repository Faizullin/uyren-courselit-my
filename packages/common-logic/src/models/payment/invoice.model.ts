import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../../lib/organization";
import { PaymentMethodEnum } from "./payment.types";
import { IInvoice, InvoiceStatusEnum } from "./invoice.types";

export const InvoiceSchema = new mongoose.Schema<IInvoice>({
  orgId: orgaizationIdField(),
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
}, {
  timestamps: true,
});

InvoiceSchema.index({ orgId: 1, status: 1 });
InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ createdAt: -1 });

InvoiceSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

InvoiceSchema.virtual('paymentPlan', {
  ref: 'PaymentPlan',
  localField: 'paymentPlanId',
  foreignField: '_id',
  justOne: true,
});

export const InvoiceModel = createModel('Invoice', InvoiceSchema);
export type IInvoiceHydratedDocument = HydratedDocument<IInvoice>;

