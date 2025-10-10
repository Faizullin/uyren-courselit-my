import mongoose from "mongoose";
import { PublicationStatusEnum } from "../../lib/publication_status";

export enum QuestionTypeEnum {
    MULTIPLE_CHOICE = "multiple_choice",
    SHORT_ANSWER = "short_answer",
}

export interface IOption {
    uid: string;
    text: string;
    isCorrect: boolean;
    order?: number;
}

export interface BaseQuestion {
    orgId: mongoose.Types.ObjectId;
    text: string;
    type: QuestionTypeEnum;
    points: number;
    explanation?: string;
    gradedById: mongoose.Types.ObjectId;
    settings?: Record<string, any>;
    options?: Array<IOption>;
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

export interface IQuiz {
    orgId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    courseId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    dueDate?: Date;
    timeLimit?: number;
    maxAttempts: number;
    passingScore: number;
    shuffleQuestions: boolean;
    showResults: boolean;
    publicationStatus: PublicationStatusEnum;
    questionIds: mongoose.Types.ObjectId[];
    totalPoints: number;
    createdAt?: number;
    updatedAt?: number;
}

