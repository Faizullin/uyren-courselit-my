import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { IApiKey } from "./api-key.types";

const ApiKeySchema = new mongoose.Schema<IApiKey>(
  {
    orgId: orgaizationIdField(),
    keyId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, default: generateUniqueId },
    purposeKey: { type: String },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

ApiKeySchema.index(
  {
    orgId: 1,
    name: 1,
  },
  { unique: true },
);

export const ApiKeyModel = createModel('ApiKey', ApiKeySchema);

