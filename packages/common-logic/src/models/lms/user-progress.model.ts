import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization"; 
import { IUserLessonProgress, IUserProgress, UserLessonProgressStatusEnum } from "./user-progress.types";

const UserLessonProgressSchema = new mongoose.Schema<IUserLessonProgress>(
    {
        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson",
            required: true
        },
        status: {
            type: String,
            enum: UserLessonProgressStatusEnum,
            required: true
        },
        completedAt: {
            type: Date,
            required: false
        }
    },
    {
        _id: false,
        timestamps: false,
    },
);

export const UserProgressSchema = new mongoose.Schema<IUserProgress>(
    {
        orgId: orgaizationIdField(),
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: true
        },
        enrollmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Enrollment",
            required: true
        },
        lessons: {
            type: [UserLessonProgressSchema],
            required: true
        }
    },
    {
        timestamps: true,
    },
);

UserProgressSchema.index({ userId: 1, courseId: 1 });
UserProgressSchema.index({ enrollmentId: 1 });
UserProgressSchema.index({ orgId: 1, courseId: 1 });
UserProgressSchema.index({ userId: 1, orgId: 1 });

export const UserProgressModel = createModel('UserProgress', UserProgressSchema);

