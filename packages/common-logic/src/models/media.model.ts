import mongoose from "mongoose";
import { orgaizationIdField } from "../lib/organization";
import { IAttachmentMedia, MediaAccessTypeEnum } from "./media.types";

export const AttachmentMediaSchema = new mongoose.Schema<IAttachmentMedia>({
  mediaId: { type: String, required: true },
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
  metadata: { type: Object, required: false },
}, {
  _id: false,
  timestamps: true,
});

