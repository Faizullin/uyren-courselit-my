import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../organization";

export enum ParticipantStatusEnum {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  EXCUSED = "excused",
}

interface ILiveClassParticipant {
  orgId: mongoose.Types.ObjectId;
  liveClassId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  status: ParticipantStatusEnum;
  joinedAt?: Date;
  leftAt?: Date;
  duration?: number; // in minutes
  notes?: string;

  markedById?: mongoose.Types.ObjectId; // User who marked attendance
}

export const LiveClassParticipantSchema = new mongoose.Schema<ILiveClassParticipant>({
  orgId: orgaizationIdField(),
  liveClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LiveClass",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  status: {
    type: String,
    required: true,
    enum: ParticipantStatusEnum,
    default: ParticipantStatusEnum.ABSENT,
    index: true,
  },
  joinedAt: {
    type: Date,
    required: false,
    index: true,
  },
  leftAt: {
    type: Date,
    required: false,
  },
  duration: {
    type: Number,
    required: false,
    min: 0,
  },
  notes: {
    type: String,
    required: false,
  },
  markedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
}, {
  timestamps: true,
});

// Indexes
LiveClassParticipantSchema.index({ orgId: 1, status: 1 });
LiveClassParticipantSchema.index({ liveClassId: 1, userId: 1 }, { unique: true });
LiveClassParticipantSchema.index({ userId: 1, status: 1 });
LiveClassParticipantSchema.index({ liveClassId: 1, status: 1 });
LiveClassParticipantSchema.index({ joinedAt: 1 });

// Virtual for user
LiveClassParticipantSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for live class
LiveClassParticipantSchema.virtual('liveClass', {
  ref: 'LiveClass',
  localField: 'liveClassId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for marked by user
LiveClassParticipantSchema.virtual('markedBy', {
  ref: 'User',
  localField: 'markedById',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to calculate duration if leftAt is provided
LiveClassParticipantSchema.pre('save', function (next) {
  if (this.joinedAt && this.leftAt && !this.duration) {
    this.duration = Math.round((this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60));
  }
  next();
});

// Instance method to mark as present
LiveClassParticipantSchema.methods.markPresent = function (notes?: string) {
  this.status = ParticipantStatusEnum.PRESENT;
  this.joinedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

// Instance method to mark as late
LiveClassParticipantSchema.methods.markLate = function (notes?: string) {
  this.status = ParticipantStatusEnum.LATE;
  this.joinedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

// Instance method to mark as absent
LiveClassParticipantSchema.methods.markAbsent = function (notes?: string) {
  this.status = ParticipantStatusEnum.ABSENT;
  if (notes) this.notes = notes;
  return this.save();
};

// Instance method to mark as excused
LiveClassParticipantSchema.methods.markExcused = function (notes?: string) {
  this.status = ParticipantStatusEnum.EXCUSED;
  if (notes) this.notes = notes;
  return this.save();
};

// Instance method to leave class
LiveClassParticipantSchema.methods.leaveClass = function () {
  if (this.joinedAt) {
    this.leftAt = new Date();
    this.duration = Math.round((this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60));
  }
  return this.save();
};

export const LiveClassParticipantModel = createModel('LiveClassParticipant', LiveClassParticipantSchema);