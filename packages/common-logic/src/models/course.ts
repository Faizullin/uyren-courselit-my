import mongoose from "mongoose";
import { generateUniqueId } from "@workspace/utils";
import {
  Constants,
  Course,
  type ProductAccessType,
  type Group,
} from "@workspace/common-models";
import { MediaSchema } from "./media";
// import { EmailSchema } from "./email";

export interface InternalCourse
  extends Omit<Course, "paymentPlans" | "lessons"> {
  domain: mongoose.Types.ObjectId;
  id: mongoose.Types.ObjectId;
  privacy: ProductAccessType;
  published: boolean;
  isFeatured: boolean;
  tags: string[];
  lessons: string[];
  sales: number;
  customers: string[];
  paymentPlans: string[];
}

const GroupSchema = new mongoose.Schema<Group>(
  {
    name: { type: String, required: true },
    groupId: { type: String, required: true, default: generateUniqueId },
    rank: { type: Number, required: true },
    collapsed: { type: Boolean, required: true, default: true },
    lessonsOrder: { type: [String] },
    drip: new mongoose.Schema<Group["drip"]>({
      type: {
        type: String,
        required: true,
        enum: Constants.dripType,
      },
      status: { type: Boolean, required: true, default: false },
      delayInMillis: { type: Number },
      dateInUTC: { type: Number },
      // email: EmailSchema,
    }),
  },
  {
    _id: false,
  },
);

export const CourseSchema = new mongoose.Schema<InternalCourse>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: String, required: true, default: generateUniqueId },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    cost: { type: Number, required: true },
    costType: {
      type: String,
      required: true,
      enum: ["free", "email", "paid"],
    },
    privacy: {
      type: String,
      required: true,
      enum: Object.values(Constants.ProductAccessType),
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(Constants.CourseType),
    },
    creatorId: { type: String, required: true },
    creatorName: { type: String },
    published: { type: Boolean, required: true, default: false },
    tags: [{ type: String }],
    lessons: [String],
    shortDescription: { type: String, required: false },
    description: { type: mongoose.Schema.Types.Mixed, default: {} },
    featuredImage: MediaSchema,
    groups: [GroupSchema],
    sales: { type: Number, required: true, default: 0.0 },
    customers: [String],
    pageId: { type: String },
    paymentPlans: [String],
    defaultPaymentPlan: { type: String },
    leadMagnet: { type: Boolean, required: true, default: false },
    level: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
    },
    duration: { type: Number, required: true },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },

    allowEnrollment: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  },
);

CourseSchema.index({
  title: "text",
});

CourseSchema.index({ domain: 1, title: 1 }, { unique: true });
