import { generateUniqueId } from "@workspace/utils";
import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { AttachmentMediaSchema } from "../media.model";
import { orgaizationIdField } from "../../lib/organization";
import { ILesson, LessonTypeEnum } from "./lesson.types";

export const LessonSchema = new mongoose.Schema<ILesson>({
    orgId: orgaizationIdField(),
    title: { type: String, required: true },
    slug: { type: String, required: true, default: generateUniqueId },
    type: {
        type: String,
        required: true,
        enum: LessonTypeEnum,
    },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    media: AttachmentMediaSchema,
    downloadable: { type: Boolean, default: false },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    requiresEnrollment: { type: Boolean, default: true },
    published: { type: Boolean, required: true, default: false },
});

LessonSchema.index({ courseId: 1, published: 1 });
LessonSchema.index({ ownerId: 1, published: 1 });
LessonSchema.index({ orgId: 1, courseId: 1 });
LessonSchema.index({ title: 'text', content: 'text' });

LessonSchema.virtual("course", {
  ref: "Course",
  localField: "courseId",
  foreignField: "_id",
  justOne: true,
});

LessonSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

export const LessonModel = createModel('Lesson', LessonSchema);
export type ILessonHydratedDocument = HydratedDocument<ILesson>;

