import mongoose from "mongoose";
import { ApprovalStatusEnum } from "../../lib/approval_status";

export enum CourseEnrollmentMemberTypeEnum {
  STUDENT = "student",
  MENTOR = "mentor",
  STAFF = "staff",
}

export enum CourseEnrollmentRoleEnum {
  MEMBER = "member",
  ADMIN = "admin",
}

export enum EnrollmentStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ICourseEnrollment {
  orgId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  paymentPlanId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cohortId?: mongoose.Types.ObjectId;
  memberType: CourseEnrollmentMemberTypeEnum;
  role: CourseEnrollmentRoleEnum;
  status: EnrollmentStatusEnum;
  approvalStatus: ApprovalStatusEnum;
  createdAt?: Date;
  updatedAt?: Date;
}

