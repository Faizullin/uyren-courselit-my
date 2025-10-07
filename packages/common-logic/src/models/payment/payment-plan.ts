import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../organization";

export enum PaymentPlanTypeEnum {
  FREE = "free",
  ONE_TIME = "onetime",
  EMI = "emi",
  SUBSCRIPTION = "subscription",
}

export enum PaymentPlanStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export interface IPaymentPlan {
  orgId: mongoose.Types.ObjectId;
  name: string;
  type: PaymentPlanTypeEnum;
  status: PaymentPlanStatusEnum;

  // Pricing fields
  oneTimeAmount?: number;
  emiAmount?: number;
  emiTotalInstallments?: number;
  subscriptionMonthlyAmount?: number;
  subscriptionYearlyAmount?: number;

  // Metadata
  currency: string;

  // References
  ownerId: mongoose.Types.ObjectId;
  entity?: {
    entityIdStr: string;
    entityId?: mongoose.Types.ObjectId;
    entityType: string;
  };

  // Flags
  isDefault: boolean;
  isInternal: boolean;
}

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

  // Pricing
  oneTimeAmount: { type: Number, min: 0 },
  emiAmount: { type: Number, min: 0 },
  emiTotalInstallments: { type: Number, min: 1, max: 24 },
  subscriptionMonthlyAmount: { type: Number, min: 0 },
  subscriptionYearlyAmount: { type: Number, min: 0 },

  // Metadata
  currency: {
    type: String,
    required: true,
    default: "USD",
    uppercase: true,
    length: 3
  },

  // References
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  entity: entityField(),

  // Flags
  isDefault: { type: Boolean, default: false },
  isInternal: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Indexes
PaymentPlanSchema.index({ orgId: 1, type: 1 });
PaymentPlanSchema.index({ orgId: 1, status: 1 });
PaymentPlanSchema.index({ ownerId: 1, status: 1 });
PaymentPlanSchema.index({ orgId: 1, isDefault: 1 });

// Virtual for owner
PaymentPlanSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

export const PaymentPlanModel = createModel('PaymentPlan', PaymentPlanSchema);
export type IPaymentPlanHydratedDocument = HydratedDocument<IPaymentPlan>;