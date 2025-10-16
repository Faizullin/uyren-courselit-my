import mongoose, { HydratedDocument } from 'mongoose';
import { createModel } from '../../lib/create-model';
import { orgaizationIdField } from '../../lib/organization';
import { CohortStatusEnum, ICohort } from './cohort.types';

export const CohortSchema = new mongoose.Schema<ICohort>({
    orgId: orgaizationIdField(),
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: CohortStatusEnum,
        required: true
    },
    beginDate: Date,
    endDate: Date,
    durationInWeeks: Number,
    description: String,
    inviteCode: {
        type: String,
        required: false,
        index: true
    },
    maxCapacity: {
        type: Number,
        required: false,
        min: 1
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

CohortSchema.index({ title: 'text', description: 'text' });
CohortSchema.index({ courseId: 1, status: 1 });
CohortSchema.index({ instructorId: 1, status: 1 });
CohortSchema.index({ orgId: 1, status: 1 });
CohortSchema.index({ beginDate: 1, endDate: 1 });

CohortSchema.virtual('course', {
    ref: 'Course',
    localField: 'courseId',
    foreignField: '_id',
    justOne: true
});

CohortSchema.virtual('instructor', {
    ref: 'User',
    localField: 'instructorId',
    foreignField: '_id',
    justOne: true
});

CohortSchema.virtual('owner', {
    ref: 'User',
    localField: 'ownerId',
    foreignField: '_id',
    justOne: true
});

export const CohortModel = createModel('Cohort', CohortSchema);
export type ICohortHydratedDocument = HydratedDocument<ICohort>;

