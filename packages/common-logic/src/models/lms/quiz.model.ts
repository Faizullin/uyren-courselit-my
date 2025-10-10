import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { PublicationStatusEnum } from "../../lib/publication_status";
import { orgaizationIdField } from "../../lib/organization";
import { IOption, IQuiz, IQuizQuestion, QuestionTypeEnum } from "./quiz.types";

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

