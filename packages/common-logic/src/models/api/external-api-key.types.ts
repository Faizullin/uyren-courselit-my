import mongoose from "mongoose";

export enum ExternalApiKeyStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  REVOKED = "revoked",
}

export interface IExternalApiKey {
  orgId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  publicKey: string;
  secretKeyHash: string;
  title: string;
  description?: string;
  status: ExternalApiKeyStatusEnum;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isSelf?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

