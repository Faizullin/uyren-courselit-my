import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../organization";

interface ApiKey {
  orgId: mongoose.Types.ObjectId;
  keyId: string;
  name: string;
  key: string;
  purposeKey?: string;
}

const ApiKeySchema = new mongoose.Schema<ApiKey>(
  {
    orgId: orgaizationIdField(),
    keyId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    key: { type: String, required: true, default: generateUniqueId },
    purposeKey: { type: String },
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