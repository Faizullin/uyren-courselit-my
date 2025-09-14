import { createModel } from "@workspace/common-logic";
import {
  BASIC_PUBLICATION_STATUS_TYPE,
  type BasicPublicationStatus,
} from "@workspace/common-models";
import mongoose, { Schema } from "mongoose";

export interface ITheme {
  name: string;
  description?: string;
  ownerId: string;
  domain: mongoose.Types.ObjectId;
  status: BasicPublicationStatus;
  assets: ThemeAsset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeAsset {
  assetType: "stylesheet" | "font" | "script" | "image";
  url?: string;
  content?: string;
  preload?: boolean;
  async?: boolean;
  defer?: boolean;
  media?: string;
  crossorigin?: string;
  integrity?: string;
  rel?: string;
  sizes?: string;
  mimeType?: string;
  name?: string;
  description?: string;
}

const ThemeAssetSchema = new Schema<ThemeAsset>({
  assetType: {
    type: String,
    required: true,
    enum: ["stylesheet", "font", "script", "image"],
  },
  url: { type: String, required: false },
  content: { type: String },
  preload: { type: Boolean, default: false },
  async: { type: Boolean, default: false },
  defer: { type: Boolean, default: false },
  media: { type: String },
  crossorigin: { type: String },
  integrity: { type: String },
  rel: { type: String },
  sizes: { type: String },
  mimeType: { type: String },
  name: { type: String },
  description: { type: String },
});

const ThemeSchema = new Schema<ITheme>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, trim: true },
    ownerId: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: [
        BASIC_PUBLICATION_STATUS_TYPE.DRAFT,
        BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
        BASIC_PUBLICATION_STATUS_TYPE.ARCHIVED,
      ],
      // default: BASIC_PUBLICATION_STATUS_TYPE.DRAFT
    },

    assets: [ThemeAssetSchema],
  },
  {
    timestamps: true,
  },
);

ThemeSchema.index({ ownerId: 1, status: 1 });
ThemeSchema.index({ domain: 1, status: 1 });

// Virtual populate for owner
ThemeSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "userId",
  justOne: true,
});

export default createModel("Theme", ThemeSchema);
