import { generateUniqueId } from "@workspace/utils";
import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { AttachmentMediaSchema, IAttachmentMedia } from "../media";
import { orgaizationIdField } from "../organization";

interface IEmbedUrlContent {
    type: "embed";
    value: string;
};

export enum LessonTypeEnum {
    TEXT = "text",
    VIDEO = "video",
    AUDIO = "audio",
    PDF = "pdf",
    FILE = "file",
    EMBED = "embed",
    QUIZ = "quiz",
}

export interface ILesson {
    orgId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    type: LessonTypeEnum;
    content: ITextEditorContent | IEmbedUrlContent;
    media?: IAttachmentMedia;
    downloadable: boolean;
    ownerId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;

    requiresEnrollment: boolean;
    published: boolean;
}

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