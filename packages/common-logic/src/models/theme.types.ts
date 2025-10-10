import mongoose from "mongoose";
import { PublicationStatusEnum } from "../lib/publication_status";

export enum ThemeAssetTypeEnum {
  STYLESHEET = "stylesheet",
  FONT = "font",
  SCRIPT = "script",
  IMAGE = "image",
}

export interface IThemeAsset {
  _id: mongoose.Types.ObjectId;
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

export interface ITheme {
  orgId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  publicationStatus: PublicationStatusEnum;
  assets: IThemeAsset[];
  createdAt: number;
  updatedAt: number;
}

