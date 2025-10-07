import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField, IEntity } from "../../lib/entity";
import { orgaizationIdField } from "../organization";

export enum ChatRoomTypeEnum {
  PRIVATE = "private",
  GROUP = "group",
  COURSE = "course",
  COHORT = "cohort",
  LIVE_CLASS = "live_class",
  ASSIGNMENT = "assignment",
  ANNOUNCEMENT = "announcement",
}

export enum ChatRoomStatusEnum {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

interface IChatRoom {
  orgId: mongoose.Types.ObjectId;

  // Basic info
  name: string;
  description?: string;
  type: ChatRoomTypeEnum;
  status: ChatRoomStatusEnum;

  // Entity reference (what this chat is for)
  entity?: IEntity;

  // Room settings
  isPrivate: boolean;
  allowInvites: boolean;
  allowFileUploads: boolean;
  allowReactions: boolean;
  maxParticipants?: number;

  // Moderation
  moderatorIds: mongoose.Types.ObjectId[];
  mutedUserIds: mongoose.Types.ObjectId[];

  // Metadata
  lastMessageAt?: Date;
  lastMessageId?: mongoose.Types.ObjectId;
  messageCount: number;
  participantCount: number;

  // Creator
  createdById: mongoose.Types.ObjectId;
}

export const ChatRoomSchema = new mongoose.Schema<IChatRoom>({
  orgId: orgaizationIdField(),

  // Basic info
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

  // Entity reference
  entity: entityField(),

  // Room settings
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

  // Moderation
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

  // Metadata
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

  // Creator
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes
ChatRoomSchema.index({ orgId: 1, status: 1 });
ChatRoomSchema.index({ orgId: 1, type: 1 });
ChatRoomSchema.index({ orgId: 1, isPrivate: 1 });
ChatRoomSchema.index({ "entity.entityType": 1, "entity.entityId": 1 });
ChatRoomSchema.index({ lastMessageAt: -1 });
ChatRoomSchema.index({ createdById: 1, status: 1 });

// Virtual for creator
ChatRoomSchema.virtual('createdBy', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
});

// Virtual for last message
ChatRoomSchema.virtual('lastMessage', {
  ref: 'ChatMessage',
  localField: 'lastMessageId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for moderators
ChatRoomSchema.virtual('moderators', {
  ref: 'User',
  localField: 'moderatorIds',
  foreignField: '_id',
});

// Virtual for muted users
ChatRoomSchema.virtual('mutedUsers', {
  ref: 'User',
  localField: 'mutedUserIds',
  foreignField: '_id',
});

// Create and export model
export const ChatRoomModel = createModel('ChatRoom', ChatRoomSchema);


