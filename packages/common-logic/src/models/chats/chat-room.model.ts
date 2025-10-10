import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../../lib/organization";
import { ChatRoomStatusEnum, ChatRoomTypeEnum, IChatRoom } from "./chat-room.types";

export const ChatRoomSchema = new mongoose.Schema<IChatRoom>({
  orgId: orgaizationIdField(),
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: false,
    maxlength: 500,
  },
  type: {
    type: String,
    required: true,
    enum: ChatRoomTypeEnum,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ChatRoomStatusEnum,
    default: ChatRoomStatusEnum.ACTIVE,
    index: true,
  },
  entity: entityField(),
  isPrivate: {
    type: Boolean,
    default: false,
    index: true,
  },
  allowInvites: {
    type: Boolean,
    default: true,
  },
  allowFileUploads: {
    type: Boolean,
    default: true,
  },
  allowReactions: {
    type: Boolean,
    default: true,
  },
  maxParticipants: {
    type: Number,
    required: false,
    min: 2,
    max: 1000,
  },
  moderatorIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  mutedUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }],
  lastMessageAt: {
    type: Date,
    required: false,
    index: true,
  },
  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage",
    required: false,
  },
  messageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  participantCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

ChatRoomSchema.index({ orgId: 1, status: 1 });
ChatRoomSchema.index({ orgId: 1, type: 1 });
ChatRoomSchema.index({ orgId: 1, isPrivate: 1 });
ChatRoomSchema.index({ "entity.entityType": 1, "entity.entityId": 1 });
ChatRoomSchema.index({ lastMessageAt: -1 });
ChatRoomSchema.index({ createdById: 1, status: 1 });

ChatRoomSchema.virtual('createdBy', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
});

ChatRoomSchema.virtual('lastMessage', {
  ref: 'ChatMessage',
  localField: 'lastMessageId',
  foreignField: '_id',
  justOne: true,
});

ChatRoomSchema.virtual('moderators', {
  ref: 'User',
  localField: 'moderatorIds',
  foreignField: '_id',
});

ChatRoomSchema.virtual('mutedUsers', {
  ref: 'User',
  localField: 'mutedUserIds',
  foreignField: '_id',
});

export const ChatRoomModel = createModel('ChatRoom', ChatRoomSchema);

