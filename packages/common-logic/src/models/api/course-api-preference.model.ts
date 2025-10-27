import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { ICourseApiPreference } from "./course-api-preference.types";

const CourseApiPreferenceSchema = new mongoose.Schema<ICourseApiPreference>(
  {
    orgId: orgaizationIdField(),
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    externalApiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalApiKey",
      required: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CourseApiPreferenceSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

CourseApiPreferenceSchema.virtual("course", {
  ref: "Course",
  localField: "courseId",
  foreignField: "_id",
  justOne: true,
});

CourseApiPreferenceSchema.virtual("externalApiKey", {
  ref: "ExternalApiKey",
  localField: "externalApiKeyId",
  foreignField: "_id",
  justOne: true,
});

// Unique index: one preference per course
CourseApiPreferenceSchema.index({ orgId: 1, courseId: 1 });

export const CourseApiPreferenceModel = createModel(
  "CourseApiPreference",
  CourseApiPreferenceSchema,
);
export type ICourseApiPreferenceHydratedDocument =
  HydratedDocument<ICourseApiPreference>;

