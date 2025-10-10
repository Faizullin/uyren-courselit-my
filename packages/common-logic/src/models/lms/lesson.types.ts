import mongoose from "mongoose";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { IAttachmentMedia } from "../media.types";

export interface IEmbedUrlContent {
    type: "embed";
    value: string;
}

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

