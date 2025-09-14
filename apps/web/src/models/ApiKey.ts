import { createModel } from "@workspace/common-logic";
import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";

export interface ApiKey {
  domain: mongoose.Types.ObjectId;
  keyId: string;
  name: string;
  key: string;
  purposeKey?: string;
}

const ApiKeySchema = new mongoose.Schema<ApiKey>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
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
    domain: 1,
    name: 1,
  },
  { unique: true },
);

const ApikeyModel = createModel("Apikey", ApiKeySchema);

export default ApikeyModel;
