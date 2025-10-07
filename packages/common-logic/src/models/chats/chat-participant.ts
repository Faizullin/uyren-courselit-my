import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../organization";

export enum ChatParticipantRoleEnum {
  MEMBER = "member",
  MODERATOR = "moderator",
  ADMIN = "admin",
}

export enum ChatParticipantStatusEnum {
  ACTIVE = "active",
  MUTED = "muted",
  BANNED = "banned",
  LEFT = "left",
}

interface IChatParticipant {
  orgId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Role and status
  role: ChatParticipantRoleEnum;
  status: ChatParticipantStatusEnum;

  // Permissions
  canSendMessages: boolean;
  canSendFiles: boolean;
  canInviteUsers: boolean;
  canDeleteMessages: boolean;

  // Activity tracking
  joinedAt: Date;
  lastSeenAt?: Date;
  lastMessageAt?: Date;
  messageCount: number;

  // Notifications
  notificationsEnabled: boolean;
  muteUntil?: Date;

  // Metadata
  invitedById?: mongoose.Types.ObjectId;
  leftAt?: Date;
}

export const ChatParticipantSchema = new mongoose.Schema<IChatParticipant>({
  orgId: orgaizationIdField(),
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Role and status
  role: {
    type: String,
    required: true,
    enum: ChatParticipantRoleEnum,
    default: ChatParticipantRoleEnum.MEMBER,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ChatParticipantStatusEnum,
    default: ChatParticipantStatusEnum.ACTIVE,
    index: true,
  },

  // Permissions
  canSendMessages: {
    type: Boolean,
    default: true,
  },
  canSendFiles: {
    type: Boolean,
    default: true,
  },
  canInviteUsers: {
    type: Boolean,
    default: false,
  },
  canDeleteMessages: {
    type: Boolean,
    default: false,
  },

  // Activity tracking
  joinedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastSeenAt: {
    type: Date,
    required: false,
    index: true,
  },
  lastMessageAt: {
    type: Date,
    required: false,
  },
  messageCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Notifications
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  muteUntil: {
    type: Date,
    required: false,
  },

  // Metadata
  invitedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  leftAt: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
});

// Indexes
ChatParticipantSchema.index({ orgId: 1, status: 1 });
ChatParticipantSchema.index({ roomId: 1, userId: 1 }, { unique: true });
ChatParticipantSchema.index({ roomId: 1, role: 1 });
ChatParticipantSchema.index({ roomId: 1, status: 1 });
ChatParticipantSchema.index({ userId: 1, status: 1 });
ChatParticipantSchema.index({ lastSeenAt: -1 });
ChatParticipantSchema.index({ joinedAt: -1 });

// Virtual for user
ChatParticipantSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for room
ChatParticipantSchema.virtual('room', {
  ref: 'ChatRoom',
  localField: 'roomId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for inviter
ChatParticipantSchema.virtual('invitedBy', {
  ref: 'User',
  localField: 'invitedById',
  foreignField: '_id',
  justOne: true,
});

// Create and export model
export const ChatParticipantModel = createModel('ChatParticipant', ChatParticipantSchema);

