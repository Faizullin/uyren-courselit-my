import mongoose from "mongoose";

export enum UserLessonProgressStatusEnum {
    COMPLETED = "completed",
    IN_PROGRESS = "in_progress",
    NOT_STARTED = "not_started",
}

export interface IUserLessonProgress {
    lessonId: mongoose.Types.ObjectId;
    status: UserLessonProgressStatusEnum;
    completedAt?: Date;
}

export interface IUserProgress {
    orgId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    enrollmentId: mongoose.Types.ObjectId;
    lessons: IUserLessonProgress[];
    
    createdAt: Date;
    updatedAt: Date;
}

