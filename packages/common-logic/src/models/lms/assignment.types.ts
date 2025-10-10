import mongoose from "mongoose";
import { PublicationStatusEnum } from "../../lib/publication_status";
import { IAttachmentMedia } from "../media.types";

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

export enum AssignmentSubmissionStatusEnum {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    GRADED = "graded",
    LATE = "late",
}

export interface IRubric {
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
    beginDate?: Date;
    dueDate?: Date;
    scheduledDate?: Date;
    eventDuration?: number;
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
    createdAt?: number;
    updatedAt?: number;
}

export interface IPeerReview {
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

