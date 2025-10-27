import mongoose from "mongoose";
import { ApprovalStatusEnum } from "../../lib/approval_status";

export interface IEnrollmentRequest {
  orgId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  status: ApprovalStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}

