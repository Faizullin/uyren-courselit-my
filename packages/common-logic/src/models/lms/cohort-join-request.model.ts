import mongoose, { HydratedDocument } from 'mongoose';
import { ApprovalStatusEnum } from '../../lib/approval_status';
import { createModel } from '../../lib/create-model';
import { orgaizationIdField } from '../../lib/organization';
import { ICohortJoinRequest } from './cohort-join-request.types';

export const CohortJoinRequestSchema = new mongoose.Schema<ICohortJoinRequest>({
    orgId: orgaizationIdField(),
    cohortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cohort',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
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

CohortJoinRequestSchema.index({ cohortId: 1, email: 1 }, { unique: true });
CohortJoinRequestSchema.index({ userId: 1, status: 1 });
CohortJoinRequestSchema.index({ orgId: 1, status: 1 });
CohortJoinRequestSchema.index({ status: 1, createdAt: -1 });

CohortJoinRequestSchema.virtual('cohort', {
    ref: 'Cohort',
    localField: 'cohortId',
    foreignField: '_id',
    justOne: true
});

CohortJoinRequestSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

export const CohortJoinRequestModel = createModel('CohortJoinRequest', CohortJoinRequestSchema);
export type ICohortJoinRequestHydratedDocument = HydratedDocument<ICohortJoinRequest>;

