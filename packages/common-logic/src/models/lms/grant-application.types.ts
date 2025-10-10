import mongoose from "mongoose";
import { ApprovalStatusEnum } from "../../lib/approval_status";

export enum EducationStatusEnum {
    HIGH_SCHOOL_9 = "high-school-9",
    HIGH_SCHOOL_10 = "high-school-10",
    HIGH_SCHOOL_11 = "high-school-11",
    HIGH_SCHOOL_12 = "high-school-12",
    COLLEGE = "college",
    UNIVERSITY = "university",
    OTHER = "other",
}

export enum IntendedTrackEnum {
    PROGRAMMING = "programming",
    ANALYTICS = "analytics",
    AI = "ai",
    DATA_SCIENCE = "data-science",
}

export enum AidTypeEnum {
    FULL_GRANT = "100-percent",
    FIFTY_PERCENT = "50-percent",
}

export interface IGrantApplication {
    orgId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    fullName: string;
    email: string;
    phone: string;
    educationStatus: EducationStatusEnum;
    intendedTrack: IntendedTrackEnum;
    aidType: AidTypeEnum;
    motivation: string;
    consent: boolean;
    approvalStatus: ApprovalStatusEnum;
    reviewedById?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewedNotes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

