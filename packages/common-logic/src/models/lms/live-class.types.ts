import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";

export enum LiveClassStatusEnum {
  SCHEDULED = "scheduled",
  LIVE = "live",
  ENDED = "ended",
  CANCELLED = "cancelled",
}

export enum LiveClassTypeEnum {
  LECTURE = "lecture",
  WORKSHOP = "workshop",
  Q_AND_A = "q_and_a",
  GROUP_DISCUSSION = "group_discussion",
  PRESENTATION = "presentation",
}

export interface ILiveClass {
  orgId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: LiveClassTypeEnum;
  status: LiveClassStatusEnum;
  entity: IEntity;
  instructorId: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
  meetingUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  maxParticipants?: number;
  allowRecording: boolean;
  allowChat: boolean;
  allowScreenShare: boolean;
  allowParticipantVideo: boolean;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  location?: {
    name: string;
    online?: boolean;
    room?: string;
  };
  recordingUrl?: string;
  recordingDuration?: number;
  notes?: string;
  createdById: mongoose.Types.ObjectId;
}

