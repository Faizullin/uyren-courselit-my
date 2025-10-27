import mongoose, { HydratedDocument } from "mongoose";
import { ApprovalStatusEnum } from "../../lib/approval_status";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { IEnrollmentRequest } from "./enrollment-request.types";

export const EnrollmentRequestSchema = new mongoose.Schema<IEnrollmentRequest>({
  orgId: orgaizationIdField(),
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ApprovalStatusEnum,
    required: true,
    default: ApprovalStatusEnum.PENDING
  },
}, {
  timestamps: true
});

EnrollmentRequestSchema.index({ userId: 1, courseId: 1 });
EnrollmentRequestSchema.index({ courseId: 1, status: 1 });
EnrollmentRequestSchema.index({ orgId: 1, userId: 1 });

EnrollmentRequestSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true
});

EnrollmentRequestSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

export type IEnrollmentRequestHydratedDocument = HydratedDocument<IEnrollmentRequest>;

export const EnrollmentRequestModel = createModel('EnrollmentRequest', EnrollmentRequestSchema);

