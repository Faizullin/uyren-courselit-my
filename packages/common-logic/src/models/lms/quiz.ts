import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { PublicationStatusEnum } from "../../lib/publication_status";
import { orgaizationIdField } from "../organization";


export interface IQuiz {
    orgId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    courseId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;

    // Scheduling
    startDate?: Date;    // When quiz becomes available
    endDate?: Date;      // When quiz closes (hard deadline)
    dueDate?: Date;      // Soft deadline (can submit late with penalty)

    // Quiz settings
    timeLimit?: number;
    maxAttempts: number;
    passingScore: number;
    shuffleQuestions: boolean;
    showResults: boolean;
    publicationStatus: PublicationStatusEnum;
    questionIds: mongoose.Types.ObjectId[];
    totalPoints: number;
}

export const QuizSchema = new mongoose.Schema<IQuiz>(
    {
        orgId: orgaizationIdField(),
        title: { type: String, required: true, trim: true, maxlength: 255 },
        description: { type: String, trim: false },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true, index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, index: true,
        },

        // Scheduling
        startDate: {
            type: Date,
            required: false,
            index: true,
        },
        endDate: {
            type: Date,
            required: false,
            index: true,
        },
        dueDate: {
            type: Date,
            required: false,
            index: true,
        },

        // Quiz settings
        timeLimit: { type: Number, min: 1 },
        maxAttempts: { type: Number, min: 1, max: 10, default: 1 },
        passingScore: { type: Number, min: 0, max: 100, default: 60 },
        shuffleQuestions: { type: Boolean, default: true },
        showResults: { type: Boolean, default: false },
        publicationStatus: {
            type: String,
            required: true,
            enum: PublicationStatusEnum,
            default: PublicationStatusEnum.DRAFT,
        },
        questionIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuizQuestion",
            required: true,
        }],
        totalPoints: { type: Number, min: 0, default: 0 },
    },
    {
        timestamps: true,
    },
);

QuizSchema.index({ ownerId: 1, publicationStatus: 1 });
QuizSchema.index({ courseId: 1, publicationStatus: 1 });
QuizSchema.index({ orgId: 1, courseId: 1 });
QuizSchema.index({ startDate: 1, endDate: 1 });
QuizSchema.index({ dueDate: 1, publicationStatus: 1 });
QuizSchema.index({ orgId: 1, startDate: 1 });
QuizSchema.index({ orgId: 1, endDate: 1 });
QuizSchema.virtual("owner", {
    ref: "User",
    localField: "ownerId",
    foreignField: "_id",
    justOne: true,
});
QuizSchema.virtual("course", {
    ref: "Course",
    localField: "courseId",
    foreignField: "_id",
    justOne: true,
});


export enum QuestionTypeEnum {
    MULTIPLE_CHOICE = "multiple_choice",
    SHORT_ANSWER = "short_answer",
}

interface BaseQuestion {
    orgId: mongoose.Types.ObjectId;
    text: string;
    type: QuestionTypeEnum;
    points: number;
    explanation?: string;
    gradedById: mongoose.Types.ObjectId;
    settings?: Record<string, any>;
    options?: Array<IOption>;
}

export interface IOption {
    uid: string;
    text: string;
    isCorrect: boolean;
    order?: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: QuestionTypeEnum.MULTIPLE_CHOICE;
    correctAnswers: string[];
}

export interface ShortAnswerQuestion extends BaseQuestion {
    type: QuestionTypeEnum.SHORT_ANSWER;
    correctAnswers?: string[];
}

export type IQuizQuestion = MultipleChoiceQuestion | ShortAnswerQuestion;

export const OptionSchema = new mongoose.Schema<IOption>(
    {
        uid: { type: String, required: true, unique: true },
        text: { type: String, required: true, trim: true, maxlength: 500 },
        isCorrect: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
    },
    {
        _id: false,
        timestamps: true,
    });

export const QuizQuestionSchema = new mongoose.Schema<IQuizQuestion>(
    {
        orgId: orgaizationIdField(),
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        type: {
            type: String,
            required: true,
            enum: QuestionTypeEnum,
        },
        points: { type: Number, required: true, min: 1, max: 100, default: 1 },
        explanation: { type: String, trim: true, maxlength: 2000 },
        gradedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, index: true,
        },
        settings: { type: mongoose.Schema.Types.Mixed },

        // Multiple choice
        options: { type: [OptionSchema], default: [] },
        correctAnswers: [{ type: String, trim: true }],
    },
    {
        timestamps: true,
    },
);

export const QuizModel = createModel('Quiz', QuizSchema);
export type IQuizHydratedDocument = HydratedDocument<IQuiz>;
export const QuizQuestionModel = createModel('QuizQuestion', QuizQuestionSchema);
export type IQuizQuestionHydratedDocument = HydratedDocument<IQuizQuestion>;