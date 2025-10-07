import mongoose from "mongoose";
import { createModel } from "../lib/create-model";
import { PublicationStatusEnum } from "../lib/publication_status";
import { orgaizationIdField } from "./organization";

export enum ThemeAssetTypeEnum {
  STYLESHEET = "stylesheet",
  FONT = "font",
  SCRIPT = "script",
  IMAGE = "image",
}

export interface ITheme {
  orgId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  publicationStatus: PublicationStatusEnum;
  assets: IThemeAsset[];
}

export interface IThemeAsset {
  assetType: ThemeAssetTypeEnum;
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

const ThemeAssetSchema = new mongoose.Schema<IThemeAsset>({
  assetType: {
    type: String,
    required: true,
    enum: ThemeAssetTypeEnum,
  },
  url: {
    type: String,
    required: false,
  },
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

export const ThemeSchema = new mongoose.Schema<ITheme>(
  {
    orgId: orgaizationIdField(),
    name: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, index: true,
    },
    publicationStatus: {
      type: String,
      required: true,
      enum: PublicationStatusEnum,
      default: PublicationStatusEnum.DRAFT,
    },
    assets: [ThemeAssetSchema],
  },
  {
    timestamps: true,
  },
);

ThemeSchema.index({ ownerId: 1, publicationStatus: 1 });
ThemeSchema.index({ orgId: 1, publicationStatus: 1 });

ThemeSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

export const ThemeModel = createModel('Theme', ThemeSchema);
export type IThemeHydratedDocument = mongoose.HydratedDocument<ITheme>;