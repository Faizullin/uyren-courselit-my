import mongoose from "mongoose";
import { orgaizationIdField } from "./organization";

export enum MediaAccessTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export interface IAttachmentMedia {
  orgId: mongoose.Types.ObjectId;
  storageProvider: "cloudinary" | "local" | "custom";
  url: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  access: MediaAccessTypeEnum;
  thumbnail: string;
  caption?: string;
  file?: string;
  metadata?: any;
  ownerId: mongoose.Types.ObjectId;
}

export const AttachmentMediaSchema = new mongoose.Schema<IAttachmentMedia>({
  orgId: orgaizationIdField(),
  originalFileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  access: {
    type: String,
    required: true,
    enum: MediaAccessTypeEnum,
  },
  thumbnail: String,
  caption: String,
  file: String,
  url: { type: String, required: true },
  storageProvider: { type: String, required: true },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
}, {
  _id: false,
  timestamps: true,
});

