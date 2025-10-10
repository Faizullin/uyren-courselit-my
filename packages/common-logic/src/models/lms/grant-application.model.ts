import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { ApprovalStatusEnum } from "../../lib/approval_status";
import { AidTypeEnum, EducationStatusEnum, IGrantApplication, IntendedTrackEnum } from "./grant-application.types";

export const GrantApplicationSchema = new mongoose.Schema<IGrantApplication>({
    orgId: orgaizationIdField(),
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    educationStatus: {
        type: String,
        enum: EducationStatusEnum,
        required: true,
    },
    intendedTrack: {
        type: String,
        enum: IntendedTrackEnum,
        required: true,
    },
    aidType: {
        type: String,
        enum: AidTypeEnum,
        required: true,
    },
    motivation: {
        type: String,
        required: true,
        minlength: 100,
        maxlength: 1000,
    },
    consent: {
        type: Boolean,
        required: true,
        default: false,
    },
    approvalStatus: {
        type: String,
            enum: ApprovalStatusEnum,
        required: true,
        default: ApprovalStatusEnum.PENDING,
    },
    reviewedById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    reviewedAt: {
        type: Date,
        required: false,
    },
    reviewedNotes: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});

GrantApplicationSchema.index({ email: 1, orgId: 1 });
GrantApplicationSchema.index({ approvalStatus: 1 });
GrantApplicationSchema.index({ createdAt: -1 });

export const GrantApplicationModel = createModel('GrantApplication', GrantApplicationSchema);
export type IGrantApplicationHydratedDocument = HydratedDocument<IGrantApplication>;

