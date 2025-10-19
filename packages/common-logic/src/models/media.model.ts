import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../lib/create-model";
import { entityField } from "../lib/entity";
import { orgaizationIdField } from "../lib/organization";
import { IAttachment, IAttachmentMedia, MediaAccessTypeEnum } from "./media.types";

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

const AttachmentSchema = new mongoose.Schema<IAttachment>({
  orgId: orgaizationIdField(),
  mediaId: { type: String, required: true, unique: true, index: true },
  originalFileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  access: {
    type: String,
    required: true,
    enum: MediaAccessTypeEnum,
    index: true,
  },
  thumbnail: String,
  caption: String,
  file: String,
  url: { type: String, required: true },
  storageProvider: { type: String, required: true },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  entity: entityField(),
  metadata: { type: Object, required: false },
}, {
  timestamps: true,
});

AttachmentSchema.index({ orgId: 1, access: 1 });
AttachmentSchema.index({ ownerId: 1, createdAt: -1 });
AttachmentSchema.index({ "entity.entityType": 1, "entity.entityId": 1 });
AttachmentSchema.index({ mediaId: 1, orgId: 1 });

AttachmentSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

export const AttachmentModel = createModel('Attachment', AttachmentSchema);
export type IAttachmentHydratedDocument = HydratedDocument<IAttachment>;

