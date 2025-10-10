import mongoose from "mongoose";
import { ApprovalStatusEnum } from "../../lib/approval_status";

export interface ICohortJoinRequest {
    orgId: mongoose.Types.ObjectId;
    cohortId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    email: string;
    status: ApprovalStatusEnum;
}

