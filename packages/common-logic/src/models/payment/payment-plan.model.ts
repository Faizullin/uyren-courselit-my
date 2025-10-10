import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../../lib/organization";
import { IPaymentPlan, PaymentPlanStatusEnum, PaymentPlanTypeEnum } from "./payment-plan.types";

export const PaymentPlanSchema = new mongoose.Schema<IPaymentPlan>({
  orgId: orgaizationIdField(),
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  type: {
    type: String,
    required: true,
    enum: PaymentPlanTypeEnum,
  },
  status: {
    type: String,
    required: true,
    enum: PaymentPlanStatusEnum,
    default: PaymentPlanStatusEnum.ACTIVE,
  },
  oneTimeAmount: { type: Number, min: 0 },
  emiAmount: { type: Number, min: 0 },
  emiTotalInstallments: { type: Number, min: 1, max: 24 },
  subscriptionMonthlyAmount: { type: Number, min: 0 },
  subscriptionYearlyAmount: { type: Number, min: 0 },
  currency: {
    type: String,
    required: true,
    default: "USD",
    uppercase: true,
    length: 3
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  entity: entityField(),
  isDefault: { type: Boolean, default: false },
  isInternal: { type: Boolean, default: false },
}, {
  timestamps: true,
});

PaymentPlanSchema.index({ orgId: 1, type: 1 });
PaymentPlanSchema.index({ orgId: 1, status: 1 });
PaymentPlanSchema.index({ ownerId: 1, status: 1 });
PaymentPlanSchema.index({ orgId: 1, isDefault: 1 });

PaymentPlanSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

export const PaymentPlanModel = createModel('PaymentPlan', PaymentPlanSchema);
export type IPaymentPlanHydratedDocument = HydratedDocument<IPaymentPlan>;

