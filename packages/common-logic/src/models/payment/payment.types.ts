import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";

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

export interface IPayment {
  orgId: mongoose.Types.ObjectId;
  paymentId: string;
  userId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  entity: IEntity;
  amount: number;
  currency: string;
  status: PaymentStatusEnum;
  method: PaymentMethodEnum;
  processorTransactionId?: string;
  processorSessionId?: string;
  processedAt?: Date;
  failedAt?: Date;
  metadata?: Record<string, any>;
}

