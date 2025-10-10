import mongoose from "mongoose";

export interface IApiKey {
  orgId: mongoose.Types.ObjectId;
  keyId: string;
  name: string;
  keyHash: string;
  purposeKey?: string;
  expiresAt?: Date;
  createdAt?: number;
  updatedAt?: number;
}

