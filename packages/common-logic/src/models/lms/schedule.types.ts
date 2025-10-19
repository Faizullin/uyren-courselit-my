import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";

export enum ScheduleTypeEnum {
  ASSIGNMENT = "assignment",
  QUIZ = "quiz",
  LIVE_SESSION = "live_session",
  DEADLINE = "deadline",
}

export enum ScheduleStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum RecurrenceTypeEnum {
  NONE = "none",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export interface IScheduleEvent {
  orgId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: ScheduleTypeEnum;
  status: ScheduleStatusEnum;
  entity: IEntity;
  startDate: Date;
  endDate: Date;
  duration?: number;
  allDay: boolean;
  recurrence: {
    type: RecurrenceTypeEnum;
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
  };
  location?: {
    name: string;
    online?: boolean;
    meetingUrl?: string;
  };
  instructorId?: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
  reminders: {
    enabled: boolean;
    minutesBefore: number[];
  };
}

