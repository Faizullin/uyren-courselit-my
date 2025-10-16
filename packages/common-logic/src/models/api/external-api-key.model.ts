import { generateUniqueId } from "@workspace/utils";
import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import {
  ExternalApiKeyStatusEnum,
  IExternalApiKey,
} from "./external-api-key.types";

const ExternalApiKeySchema = new mongoose.Schema<IExternalApiKey>(
  {
    orgId: orgaizationIdField(),
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    publicKey: {
      type: String,
      required: true,
      index: true,
    },
    secretKeyHash: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(ExternalApiKeyStatusEnum),
      default: ExternalApiKeyStatusEnum.ACTIVE,
      index: true,
    },
    expiresAt: {
      type: Date,
    },
    lastUsedAt: {
      type: Date,
    },
    isSelf: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ExternalApiKeySchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

ExternalApiKeySchema.index({ publicKey: 1 }, { unique: true });
ExternalApiKeySchema.index({ orgId: 1, ownerId: 1 });
ExternalApiKeySchema.index({ orgId: 1, status: 1 });

export const ExternalApiKeyModel = createModel(
  "ExternalApiKey",
  ExternalApiKeySchema,
);
export type IExternalApiKeyHydratedDocument =
  HydratedDocument<IExternalApiKey>;

