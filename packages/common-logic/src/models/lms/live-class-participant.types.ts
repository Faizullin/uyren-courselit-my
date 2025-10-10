import mongoose from "mongoose";

export enum ParticipantStatusEnum {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  EXCUSED = "excused",
}

export interface ILiveClassParticipant {
  orgId: mongoose.Types.ObjectId;
  liveClassId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: ParticipantStatusEnum;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number;
  notes?: string;
  markedById?: mongoose.Types.ObjectId;
}

