import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { AttachmentMediaSchema } from "../media.model";
import { orgaizationIdField } from "../../lib/organization";
import { ICourse, ICourseChapter, ICourseInstructor, CourseLevelEnum, CourseStatusEnum } from "./course.types";

export const CourseChapterSchema = new mongoose.Schema<ICourseChapter>(
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    order: { type: Number, required: true, default: 0 },
    lessonOrderIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Lesson",
      required: true,
      default: [],
    },
  },
  {
    _id: true,
  },
);

export const CourseInstructorSchema = new mongoose.Schema<ICourseInstructor>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String, required: true },
  },
  {
    _id: false,
  },
);

export const CourseSchema = new mongoose.Schema<ICourse>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    description: { type: mongoose.Schema.Types.Mixed, required: false },
    courseCode: { type: String, required: true },
    tagIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Tag",
      required: true,
    },
    shortDescription: { type: String, required: false },
    featuredImage: { type: AttachmentMediaSchema, required: false },
    chapters: { type: [CourseChapterSchema], required: true, default: [] },
    instructors: { type: [CourseInstructorSchema], required: true },
    level: {
      type: String,
      required: true,
      enum: CourseLevelEnum,
    },
    status: {
      type: String,
      required: true,
      enum: CourseStatusEnum,
    },
    orgId: orgaizationIdField(),
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
      required: false,
    },
    durationInWeeks: { type: Number, required: true },
    published: { type: Boolean, required: true, default: false },
    publishedAt: { type: Date, required: false },
    featured: { type: Boolean, required: true, default: false },
    upcoming: { type: Boolean, required: true, default: false },
    allowEnrollment: { type: Boolean, required: true, default: false },
    allowSelfEnrollment: { type: Boolean, required: true, default: false },
    paidCourse: { type: Boolean, required: true, default: false },
    paymentPlanIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "PaymentPlan",
      required: true,
    },
    defaultPaymentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentPlan",
      required: false,
    },
    statsEnrollmentCount: { type: Number, required: true, default: 0 },
    statsCompletionRate: { type: Number, required: true, default: 0 },
    statsAverageRating: { type: Number, required: true, default: 0 },
    statsLessonCount: { type: Number, required: true, default: 0 },
    language: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

CourseSchema.index({
  title: "text",
});

CourseSchema.index({ orgId: 1, title: 1 }, { unique: true });
CourseSchema.index({ orgId: 1, published: 1 });
CourseSchema.index({ ownerId: 1, status: 1 });
CourseSchema.index({ level: 1, published: 1 });

CourseSchema.pre('save', function (next) {
  if (this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

CourseSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

CourseSchema.virtual("tags", {
  ref: "Tag",
  localField: "tagIds",
  foreignField: "_id",
});

CourseSchema.virtual("paymentPlans", {
  ref: "PaymentPlan",
  localField: "paymentPlanIds",
  foreignField: "_id",
});

CourseSchema.virtual("theme", {
  ref: "Theme",
  localField: "themeId",
  foreignField: "_id",
  justOne: true,
});

export const CourseModel = createModel('Course', CourseSchema);
export type ICourseHydratedDocument = HydratedDocument<ICourse>;

