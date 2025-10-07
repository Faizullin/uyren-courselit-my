import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../organization";

export enum QuizAttemptStatusEnum {
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    ABANDONED = "abandoned",
    GRADED = "graded",
}

export type IQuizAttemptAnswer = {
    questionId: mongoose.Types.ObjectId;
    answer: any;
    isCorrect?: boolean;
    score?: number;
    feedback?: string;
    timeSpent?: number;
    gradedAt?: Date;
    gradedById?: mongoose.Types.ObjectId;
};

interface IQuizAttempt {
    orgId: mongoose.Types.ObjectId;
    quizId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    status: QuizAttemptStatusEnum;
    startedAt: Date;
    completedAt?: Date;
    expiresAt?: Date;
    answers: IQuizAttemptAnswer[];
    score?: number;
    percentageScore?: number;
    passed?: boolean;
    timeSpent?: number;
    abandonedAt?: Date;
    gradedAt?: Date;
    gradedById?: mongoose.Types.ObjectId;
}

export const QuizAttemptSchema = new mongoose.Schema<IQuizAttempt>(
    {
        orgId: orgaizationIdField(),
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true, index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, index: true,
        },
        status: {
            type: String,
            required: true,
            enum: QuizAttemptStatusEnum,
            default: QuizAttemptStatusEnum.IN_PROGRESS,
        },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        expiresAt: { type: Date },
        answers: [{
            questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
            answer: { type: mongoose.Schema.Types.Mixed },
            isCorrect: { type: Boolean },
            score: { type: Number, min: 0 },
            feedback: { type: String },
            timeSpent: { type: Number, min: 0 },
            gradedAt: { type: Date },
            gradedById: { type: mongoose.Schema.Types.ObjectId },
        }],
        score: { type: Number, min: 0 },
        percentageScore: { type: Number, min: 0, max: 100 },
        passed: { type: Boolean },
        timeSpent: { type: Number, min: 0 },
        abandonedAt: { type: Date },
        gradedAt: { type: Date },
        gradedById: { type: mongoose.Schema.Types.ObjectId },
    },
    {
        timestamps: true,
    },
);

QuizAttemptSchema.index({ quizId: 1, userId: 1, status: 1 });
QuizAttemptSchema.index({ userId: 1, status: 1 });

QuizAttemptSchema.virtual("user", {
    ref: "User",
    localField: "userId",
    // foreignField: "_id",
    justOne: true,
});

QuizAttemptSchema.virtual("quiz", {
    ref: "Quiz",
    localField: "quizId",
    // foreignField: "_id",
    justOne: true,
});

export const QuizAttemptModel = createModel('QuizAttempt', QuizAttemptSchema);
export type IQuizAttemptHydratedDocument = HydratedDocument<IQuizAttempt>;