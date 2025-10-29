import mongoose, { HydratedDocument } from 'mongoose';
import { createModel } from '../../lib/create-model';
import { PublicationStatusEnum } from '../../lib/publication_status';
import { AttachmentMediaSchema } from '../media.model';
import { orgaizationIdField } from '../../lib/organization';
import { AssignmentDifficultyEnum, AssignmentSubmissionStatusEnum, AssignmentTypeEnum, IAssignment, IAssignmentSubmission, IPeerReview } from './assignment.types';

export const AssignmentSchema = new mongoose.Schema<IAssignment>({
    orgId: orgaizationIdField(),
    title: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: AssignmentTypeEnum,
        required: true
    },
    beginDate: {
        type: Date,
        required: false
    },
    dueDate: {
        type: Date,
        required: false
    },
    scheduledDate: {
        type: Date,
        required: false,
        index: true
    },
    eventDuration: {
        type: Number,
        required: false,
        min: 1,
        max: 480
    },
    allowLateSubmission: {
        type: Boolean,
        default: true
    },
    latePenalty: {
        type: Number,
        default: 0,
    },
    totalPoints: {
        type: Number,
        required: true
    },
    instructions: {
        type: String,
        required: false
    },
    requirements: {
        type: [String],
        required: true
    },
    difficulty: {
        type: String,
        enum: AssignmentDifficultyEnum,
        required: true
    },
    attachments: {
        type: [AttachmentMediaSchema],
        required: false
    },
    rubrics: {
        type: [mongoose.Schema.Types.Mixed],
        required: false
    },
    publicationStatus: {
        type: String,
        enum: PublicationStatusEnum,
        required: true,
        default: PublicationStatusEnum.DRAFT,
    },
    maxAttempts: {
        type: Number,
        required: false
    },
    allowPeerReview: {
        type: Boolean,
        required: true,
        default: false
    },
}, {
    timestamps: true
});

AssignmentSchema.index({ title: 'text', description: 'text' });
AssignmentSchema.index({ courseId: 1, publicationStatus: 1 });
AssignmentSchema.index({ ownerId: 1, publicationStatus: 1 });
AssignmentSchema.index({ orgId: 1, courseId: 1 });
AssignmentSchema.index({ dueDate: 1, publicationStatus: 1 });
AssignmentSchema.index({ scheduledDate: 1, publicationStatus: 1 });
AssignmentSchema.index({ beginDate: 1, dueDate: 1 });
AssignmentSchema.index({ orgId: 1, scheduledDate: 1 });

export const AssignmentPeerReviewSchema = new mongoose.Schema<IPeerReview>({
    orgId: orgaizationIdField(),
    submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssignmentSubmission",
        required: true
    },
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    score: {
        type: Number,
        required: true,
    },
    feedback: {
        type: String,
        required: true
    },
    reviewedAt: {
        type: Date,
        required: true
    },
}, {
    timestamps: true
});

export const AssignmentSubmissionSchema = new mongoose.Schema<IAssignmentSubmission>({
    orgId: orgaizationIdField(),
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        required: true
    },
    cohortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cohort",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: AssignmentSubmissionStatusEnum,
        required: true
    },
    submittedAt: {
        type: Date,
        required: false,
    },
    attemptNumber: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: false
    },
    attachments: {
        type: [AttachmentMediaSchema],
        required: true
    },
    score: {
        type: Number,
        required: false
    },
    percentageScore: {
        type: Number,
        required: false
    },
    feedback: {
        type: String,
        required: false
    },
    gradedAt: {
        type: Date,
        required: false
    },
    gradedById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
}, {
    timestamps: true
});

AssignmentSchema.virtual("owner", {
    ref: "User",
    localField: "ownerId",
    foreignField: "_id",
    justOne: true,
});

AssignmentSchema.virtual("course", {
    ref: "Course",
    localField: "courseId",
    foreignField: "_id",
    justOne: true,
});

AssignmentSubmissionSchema.virtual("student", {
    ref: "User",
    localField: "userId",
    foreignField: "_id",
    justOne: true,
});

AssignmentSubmissionSchema.virtual("assignment", {
    ref: "Assignment",
    localField: "assignmentId",
    foreignField: "_id",
    justOne: true,
});

AssignmentSubmissionSchema.virtual("gradedBy", {
    ref: "User",
    localField: "gradedById",
    foreignField: "_id",
    justOne: true,
});

AssignmentSubmissionSchema.index({ assignmentId: 1, userId: 1 });
AssignmentSubmissionSchema.index({ userId: 1, status: 1 });
AssignmentSubmissionSchema.index({ orgId: 1, assignmentId: 1 });
AssignmentSubmissionSchema.index({ submittedAt: -1 });

export const AssignmentModel = createModel('Assignment', AssignmentSchema);
export type IAssignmentHydratedDocument = HydratedDocument<IAssignment>;

export const AssignmentSubmissionModel = createModel('AssignmentSubmission', AssignmentSubmissionSchema);
export type IAssignmentSubmissionHydratedDocument = HydratedDocument<IAssignmentSubmission>;

export const AssignmentPeerReviewModel = createModel('AssignmentPeerReview', AssignmentPeerReviewSchema);

