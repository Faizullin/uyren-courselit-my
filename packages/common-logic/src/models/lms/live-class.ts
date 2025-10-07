import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField, IEntity } from "../../lib/entity";
import { orgaizationIdField } from "../organization";

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

const LiveClassSchema = new mongoose.Schema<ILiveClass>({
  orgId: orgaizationIdField(),

  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    required: true,
    enum: LiveClassTypeEnum,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: LiveClassStatusEnum,
    default: LiveClassStatusEnum.SCHEDULED,
    index: true,
  },

  entity: entityField(),

  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  cohortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: false,
    index: true,
  },

  meetingUrl: {
    type: String,
    required: false,
  },
  meetingId: {
    type: String,
    required: false,
    index: true,
  },
  meetingPassword: {
    type: String,
    required: false,
  },

  maxParticipants: {
    type: Number,
    required: false,
    min: 1,
  },
  allowRecording: {
    type: Boolean,
    default: true,
  },
  allowChat: {
    type: Boolean,
    default: true,
  },
  allowScreenShare: {
    type: Boolean,
    default: true,
  },
  allowParticipantVideo: {
    type: Boolean,
    default: true,
  },

  scheduledStartTime: {
    type: Date,
    required: true,
    index: true,
  },
  scheduledEndTime: {
    type: Date,
    required: true,
    index: true,
  },
  actualStartTime: {
    type: Date,
    required: false,
  },
  actualEndTime: {
    type: Date,
    required: false,
  },

  location: {
    name: {
      type: String,
      required: false,
    },
    online: {
      type: Boolean,
      default: true,
    },
    room: {
      type: String,
      required: false,
    },
  },

  recordingUrl: {
    type: String,
    required: false,
  },
  recordingDuration: {
    type: Number,
    required: false,
    min: 0,
  },

  notes: {
    type: String,
    required: false,
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

LiveClassSchema.index({ orgId: 1, status: 1 });
LiveClassSchema.index({ instructorId: 1, scheduledStartTime: 1 });
LiveClassSchema.index({ cohortId: 1, scheduledStartTime: 1 });
LiveClassSchema.index({ "entity.entityType": 1, "entity.entityId": 1 });
LiveClassSchema.index({ scheduledStartTime: 1, scheduledEndTime: 1 });

LiveClassSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});

LiveClassSchema.virtual('cohort', {
  ref: 'Cohort',
  localField: 'cohortId',
  foreignField: '_id',
  justOne: true,
});

LiveClassSchema.virtual('createdBy', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
});

export const LiveClassModel = createModel('LiveClass', LiveClassSchema);
export type ILiveClassHydratedDocument = HydratedDocument<ILiveClass>;
