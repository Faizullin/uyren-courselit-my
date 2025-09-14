import { Media } from "./media";
import Group from "./group";
import { ProductPriceType, CourseType, ProductAccessType } from "./constants";
import { PaymentPlan } from "./payment-plan";
// import Lesson from "./lesson";
import User from "./user";
import Lesson from "./custom/lesson";
import { TextEditorContent } from "./custom/text-editor-content";

export type ProductPriceType =
  (typeof ProductPriceType)[keyof typeof ProductPriceType];

export type CourseType = (typeof CourseType)[keyof typeof CourseType];
export type ProductAccessType =
  (typeof ProductAccessType)[keyof typeof ProductAccessType];

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface Course {
  courseId: string;
  title: string;
  description?: TextEditorContent;
  creatorName: string;
  slug: string;
  isFeatured: boolean;
  cost: number;
  costType: ProductPriceType;
  creatorId: string;
  featuredImage: Media | null;
  isBlog: boolean;
  tags: string[];
  type: CourseType;
  pageId?: string;
  groups: Group[];
  paymentPlans: PaymentPlan[];
  defaultPaymentPlan?: string;
  createdAt: Date;
  updatedAt: Date;
  leadMagnet?: boolean;
  lessons?: Lesson[];
  user: User;
  themeId?: string; // Reference to existing Theme model
  level: CourseLevel;
  duration: number;
  shortDescription?: string;

  
  allowEnrollment?: boolean;
}
