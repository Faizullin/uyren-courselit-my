import { createModel } from "@workspace/common-logic";
import { Media, TextEditorContent } from "@workspace/common-models";
import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";
import constants from "../config/constants";
import { MediaSchema } from "./Media";
const { text, video, audio, pdf, quiz, file, embed } = constants;

export type EmbedUrlContent = {
  value: string;
};

export interface Lesson {
  id: mongoose.Types.ObjectId;
  domain: mongoose.Types.ObjectId;
  lessonId: string;
  title: string;
  type:
  | typeof text
  | typeof video
  | typeof audio
  | typeof pdf
  | typeof quiz
  | typeof file
  | typeof embed;
  content: TextEditorContent | EmbedUrlContent;
  media?: Media;
  downloadable: boolean;
  creatorId: mongoose.Types.ObjectId;
  courseId: string;
  requiresEnrollment: boolean;
  published: boolean;
  groupId: string;
}

const LessonSchema = new mongoose.Schema<Lesson>({
  domain: { type: mongoose.Schema.Types.ObjectId, required: true },
  lessonId: { type: String, required: true, default: generateUniqueId },
  title: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [text, video, audio, pdf, quiz, file, embed],
  },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  media: MediaSchema,
  downloadable: { type: Boolean, default: false },
  creatorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: String, required: true },
  requiresEnrollment: { type: Boolean, default: true },
  published: { type: Boolean, required: true, default: false },
  groupId: { type: String, required: true },
});

const LessonModel = createModel("Lesson", LessonSchema);

export default LessonModel;
