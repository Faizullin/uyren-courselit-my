import mongoose from "mongoose";

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

export interface IQuizAttempt {
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

