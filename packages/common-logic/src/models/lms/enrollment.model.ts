import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization"; 
import { CourseEnrollmentMemberTypeEnum, CourseEnrollmentRoleEnum, EnrollmentStatusEnum, ICourseEnrollment } from "./enrollment.types";

export const EnrollmentSchema = new mongoose.Schema<ICourseEnrollment>({
  orgId: orgaizationIdField(),
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  paymentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cohortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cohort'
  },
  memberType: {
    type: String,
    enum: CourseEnrollmentMemberTypeEnum,
    required: true
  },
  role: {
    type: String,
    enum: CourseEnrollmentRoleEnum,
    required: true
  },
  status: {
    type: String,
    enum: EnrollmentStatusEnum,
    required: true
  },
}, {
  timestamps: true
});

EnrollmentSchema.index({ userId: 1, courseId: 1 });
EnrollmentSchema.index({ courseId: 1, memberType: 1 });
EnrollmentSchema.index({ orgId: 1, userId: 1 });
EnrollmentSchema.index({ cohortId: 1, memberType: 1 });

export const EnrollmentModel = createModel('Enrollment', EnrollmentSchema);

