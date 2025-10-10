import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { ChatParticipantRoleEnum, ChatParticipantStatusEnum, IChatParticipant } from "./chat-participant.types";

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
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  muteUntil: {
    type: Date,
    required: false,
  },
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

ChatParticipantSchema.index({ orgId: 1, status: 1 });
ChatParticipantSchema.index({ roomId: 1, userId: 1 }, { unique: true });
ChatParticipantSchema.index({ roomId: 1, role: 1 });
ChatParticipantSchema.index({ roomId: 1, status: 1 });
ChatParticipantSchema.index({ userId: 1, status: 1 });
ChatParticipantSchema.index({ lastSeenAt: -1 });

ChatParticipantSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

ChatParticipantSchema.virtual('room', {
  ref: 'ChatRoom',
  localField: 'roomId',
  foreignField: '_id',
  justOne: true,
});

ChatParticipantSchema.virtual('invitedBy', {
  ref: 'User',
  localField: 'invitedById',
  foreignField: '_id',
  justOne: true,
});

export const ChatParticipantModel = createModel('ChatParticipant', ChatParticipantSchema);

