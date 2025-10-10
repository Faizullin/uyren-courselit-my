import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";

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
  metadata?: Record<string, any>;
}

