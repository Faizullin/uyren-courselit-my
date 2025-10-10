import mongoose from "mongoose";

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
  oneTimeAmount?: number;
  emiAmount?: number;
  emiTotalInstallments?: number;
  subscriptionMonthlyAmount?: number;
  subscriptionYearlyAmount?: number;
  currency: string;
  ownerId: mongoose.Types.ObjectId;
  entity?: {
    entityIdStr: string;
    entityId?: mongoose.Types.ObjectId;
    entityType: string;
  };
  isDefault: boolean;
  isInternal: boolean;
}

