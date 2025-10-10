import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { ILiveClassParticipant, ParticipantStatusEnum } from "./live-class-participant.types";

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

LiveClassParticipantSchema.index({ orgId: 1, status: 1 });
LiveClassParticipantSchema.index({ liveClassId: 1, userId: 1 }, { unique: true });
LiveClassParticipantSchema.index({ userId: 1, status: 1 });
LiveClassParticipantSchema.index({ liveClassId: 1, status: 1 });

LiveClassParticipantSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

LiveClassParticipantSchema.virtual('liveClass', {
  ref: 'LiveClass',
  localField: 'liveClassId',
  foreignField: '_id',
  justOne: true,
});

LiveClassParticipantSchema.virtual('markedBy', {
  ref: 'User',
  localField: 'markedById',
  foreignField: '_id',
  justOne: true,
});

LiveClassParticipantSchema.pre('save', function (next) {
  if (this.joinedAt && this.leftAt && !this.duration) {
    this.duration = Math.round((this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60));
  }
  next();
});

LiveClassParticipantSchema.methods.markPresent = function (notes?: string) {
  this.status = ParticipantStatusEnum.PRESENT;
  this.joinedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

LiveClassParticipantSchema.methods.markLate = function (notes?: string) {
  this.status = ParticipantStatusEnum.LATE;
  this.joinedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

LiveClassParticipantSchema.methods.markAbsent = function (notes?: string) {
  this.status = ParticipantStatusEnum.ABSENT;
  if (notes) this.notes = notes;
  return this.save();
};

LiveClassParticipantSchema.methods.markExcused = function (notes?: string) {
  this.status = ParticipantStatusEnum.EXCUSED;
  if (notes) this.notes = notes;
  return this.save();
};

LiveClassParticipantSchema.methods.leaveClass = function () {
  if (this.joinedAt) {
    this.leftAt = new Date();
    this.duration = Math.round((this.leftAt.getTime() - this.joinedAt.getTime()) / (1000 * 60));
  }
  return this.save();
};

export const LiveClassParticipantModel = createModel('LiveClassParticipant', LiveClassParticipantSchema);

