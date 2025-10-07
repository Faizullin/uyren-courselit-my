import mongoose, { HydratedDocument } from 'mongoose';
import { createModel } from '../../lib/create-model';
import { PublicationStatusEnum } from '../../lib/publication_status';
import { AttachmentMediaSchema, IAttachmentMedia } from '../media';
import { orgaizationIdField } from '../organization';

export enum AssignmentTypeEnum {
    ESSAY = 'essay',
    PROJECT = 'project',
    PRESENTATION = 'presentation',
    FILE_UPLOAD = 'file_upload',
}

export enum AssignmentDifficultyEnum {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
}

interface IRubric {
    criterion: string;
    points: number;
    description?: string;
}

export interface IAssignment {
    orgId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    courseId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    type: AssignmentTypeEnum;

    // Scheduling
    beginDate?: Date;        // When assignment opens
    dueDate?: Date;          // Hard deadline
    scheduledDate?: Date;    // When to work on assignment (in class)
    eventDuration?: number;  // Duration in minutes for in-class work

    // Assignment settings
    allowLateSubmission: boolean;
    latePenalty: number;
    totalPoints: number;
    instructions?: string;
    requirements: string[];
    difficulty: AssignmentDifficultyEnum;
    attachments: IAttachmentMedia[];
    rubrics?: IRubric[];
    publicationStatus: PublicationStatusEnum;
    maxAttempts?: number;
    allowPeerReview: boolean;
}

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
        max: 480 // Max 8 hours
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


export enum AssignmentSubmissionStatusEnum {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    GRADED = "graded",
    LATE = "late",
}

interface IPeerReview {
    orgId: mongoose.Types.ObjectId;
    submissionId: mongoose.Types.ObjectId;
    reviewerId: mongoose.Types.ObjectId;
    score: number;
    feedback: string;
    reviewedAt: Date;
}


export interface IAssignmentSubmission {
    orgId: mongoose.Types.ObjectId;
    assignmentId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    status: AssignmentSubmissionStatusEnum;
    submittedAt: Date;
    attemptNumber: number;
    content: string;
    attachments: IAttachmentMedia[];
    score?: number;
    percentageScore?: number;
    feedback?: string;
    gradedAt?: Date;
    gradedById?: mongoose.Types.ObjectId;
}

const AssignmentPeerReviewSchema = new mongoose.Schema<IPeerReview>({
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
        required: true
    },
    attemptNumber: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: true
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

// Virtuals
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

// Create and export models
export const AssignmentModel = createModel('Assignment', AssignmentSchema);
export type IAssignmentHydratedDocument = HydratedDocument<IAssignment>;
export const AssignmentSubmissionModel = createModel('AssignmentSubmission', AssignmentSubmissionSchema);
export const AssignmentPeerReviewModel = createModel('AssignmentPeerReview', AssignmentPeerReviewSchema);

