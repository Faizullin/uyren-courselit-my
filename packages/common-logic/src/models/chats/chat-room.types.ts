import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";

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

export interface IChatRoom {
  orgId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: ChatRoomTypeEnum;
  status: ChatRoomStatusEnum;
  entity?: IEntity;
  isPrivate: boolean;
  allowInvites: boolean;
  allowFileUploads: boolean;
  allowReactions: boolean;
  maxParticipants?: number;
  moderatorIds: mongoose.Types.ObjectId[];
  mutedUserIds: mongoose.Types.ObjectId[];
  lastMessageAt?: Date;
  lastMessageId?: mongoose.Types.ObjectId;
  messageCount: number;
  participantCount: number;
  createdById: mongoose.Types.ObjectId;
}

