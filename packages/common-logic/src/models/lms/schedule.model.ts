import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { orgaizationIdField } from "../../lib/organization";
import { IScheduleEvent, RecurrenceTypeEnum, ScheduleStatusEnum, ScheduleTypeEnum } from "./schedule.types";

export const ScheduleEventSchema = new mongoose.Schema<IScheduleEvent>({
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
    enum: ScheduleTypeEnum,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ScheduleStatusEnum,
    default: ScheduleStatusEnum.ACTIVE,
    index: true,
  },
  entity: entityField(),
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
    index: true,
  },
  duration: {
    type: Number,
    required: false,
    min: 0,
  },
  allDay: {
    type: Boolean,
    default: false,
  },
  recurrence: {
    type: {
      type: String,
      required: true,
      enum: RecurrenceTypeEnum,
      default: RecurrenceTypeEnum.NONE,
    },
    interval: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    daysOfWeek: {
      type: [Number],
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
  },
  location: {
    name: {
      type: String,
      required: false,
    },
    online: {
      type: Boolean,
      default: false,
    },
    meetingUrl: {
      type: String,
      required: false,
    },
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true,
  },
  cohortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: false,
    index: true,
  },
  reminders: {
    enabled: {
      type: Boolean,
      default: true,
    },
    minutesBefore: {
      type: [Number],
      default: [15, 60],
    },
  },
}, {
  timestamps: true,
});

ScheduleEventSchema.index({ orgId: 1, status: 1 });
ScheduleEventSchema.index({ startDate: 1, endDate: 1 });
ScheduleEventSchema.index({ type: 1, status: 1 });
ScheduleEventSchema.index({ instructorId: 1, startDate: 1 });
ScheduleEventSchema.index({ cohortId: 1, startDate: 1 });
ScheduleEventSchema.index({ "entity.entityType": 1, "entity.entityId": 1 });

ScheduleEventSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});

ScheduleEventSchema.virtual('cohort', {
  ref: 'Cohort',
  localField: 'cohortId',
  foreignField: '_id',
  justOne: true,
});

ScheduleEventSchema.pre('save', function (next) {
  if (!this.duration && this.startDate && this.endDate) {
    this.duration = Math.round((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60));
  }
  next();
});

export const ScheduleEventModel = createModel('ScheduleEvent', ScheduleEventSchema);
export type IScheduleEventHydratedDocument = mongoose.HydratedDocument<IScheduleEvent>;

