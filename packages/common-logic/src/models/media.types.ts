import mongoose from "mongoose";

export enum MediaAccessTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export interface IAttachmentMedia {
  mediaId: string;
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

