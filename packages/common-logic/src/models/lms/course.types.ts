import mongoose from "mongoose";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { IAttachmentMedia } from "../media.types";

export enum CourseLevelEnum {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export enum CourseStatusEnum {
  IN_PROGRESS = "in_progress",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
}

export interface ICourseInstructor {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface ICourseChapter {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  lessonOrderIds: mongoose.Types.ObjectId[];
}

export interface ICourse {
  title: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  description?: ITextEditorContent;
  courseCode: string;
  tagIds: mongoose.Types.ObjectId[];
  shortDescription?: string;
  featuredImage: IAttachmentMedia | null;
  chapters: ICourseChapter[];
  instructors: ICourseInstructor[];
  level: CourseLevelEnum;
  status: CourseStatusEnum;
  orgId: mongoose.Types.ObjectId;
  themeId?: mongoose.Types.ObjectId;
  durationInWeeks: number;
  published: boolean;
  publishedAt?: Date;
  featured: boolean;
  upcoming: boolean;
  allowEnrollment?: boolean;
  allowSelfEnrollment: boolean;
  paidCourse: boolean;
  paymentPlanIds: mongoose.Types.ObjectId[];
  defaultPaymentPlanId?: mongoose.Types.ObjectId;
  maxCapacity?: number;
  statsEnrollmentCount: number;
  statsCompletionRate: number;
  statsAverageRating: number;
  statsLessonCount: number;
  language: string;

  createdAt: Date;
  updatedAt: Date;
}

