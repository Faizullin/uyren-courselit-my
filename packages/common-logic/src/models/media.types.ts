import mongoose from "mongoose";
import { IEntity } from "../lib/entity";

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

export interface IAttachment extends IAttachmentMedia {
  _id: mongoose.Types.ObjectId;
  entity: IEntity;
  createdAt: Date;
  updatedAt: Date;
}

