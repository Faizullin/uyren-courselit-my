import mongoose from "mongoose";

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

export interface IChatParticipant {
  orgId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ChatParticipantRoleEnum;
  status: ChatParticipantStatusEnum;
  canSendMessages: boolean;
  canSendFiles: boolean;
  canInviteUsers: boolean;
  canDeleteMessages: boolean;
  joinedAt: Date;
  lastSeenAt?: Date;
  lastMessageAt?: Date;
  messageCount: number;
  notificationsEnabled: boolean;
  muteUntil?: Date;
  invitedById?: mongoose.Types.ObjectId;
  leftAt?: Date;
}

