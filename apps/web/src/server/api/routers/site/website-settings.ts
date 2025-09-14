import { Domain } from "@/models/Domain";
import WebsiteSettingsModel from "@/models/WebsiteSettings";
import WebsiteSettingsManager from "@/server/lib/website-settings-manager";
import { UIConstants } from "@workspace/common-models";
import { z } from "zod";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
  publicProcedure,
} from "../../core/procedures";
import { getFormDataSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { textEditorContentValidator } from "../../core/validators";

const { permissions } = UIConstants;

const createWebsiteSettings = async (domainObj: Domain) => {
  const created = await WebsiteSettingsModel.create({
    domain: domainObj._id,
    mainPage: {
      showBanner: true,
      bannerTitle: "Welcome to Our Learning Platform",
      bannerSubtitle: "Discover amazing courses and grow your skills",
      featuredCourses: [],
      featuredReviews: [],
      showStats: true,
      showFeatures: true,
      showTestimonials: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return created;
};

export const websiteSettingsRouter = router({
  // Get website settings for current domain (public)
  getPublicWebsiteSettings: publicProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      return await WebsiteSettingsManager.getOrCreate(ctx.domainData.domainObj._id.toString());
    }),

  // Get website settings for current domain (protected)
  getWebsiteSettings: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      return await WebsiteSettingsManager.getOrCreate(ctx.domainData.domainObj._id.toString());
    }),

  // Update website settings
  updateWebsiteSettings: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageSettings]))
    .input(
      getFormDataSchema({
        mainPage: z.object({
          showBanner: z.boolean().optional(),
          bannerTitle: z.string().min(1, "Banner title is required").optional(),
          bannerSubtitle: z.string().optional(),
          featuredCourses: z
            .array(
              z.object({
                courseId: z.string().min(1, "Course ID is required"),
                title: z.string().min(1, "Course title is required"),
                slug: z.string().min(1, "Course slug is required"),
                shortDescription: z.string(),
                level: z
                  .enum(["beginner", "intermediate", "advanced"]),
                duration: z
                  .number()
                  .min(0, "Duration must be at least 0"),
                isFeatured: z.boolean(),
                order: z.number().min(0, "Order must be at least 0"),
              }),
            )
            .optional(),
          featuredReviews: z
            .array(
              z.object({
                reviewId: z.string().min(1, "Review ID is required"),
                author: z.any(),
                rating: z
                  .number()
                  .min(1, "Rating must be at least 1")
                  .max(10, "Rating cannot exceed 10"),
                content: textEditorContentValidator().optional(),
                targetType: z.string(),
                targetId: z.string(),
                order: z.number().min(0, "Order must be at least 0"),
              }),
            )
            .optional(),
          showStats: z.boolean().optional(),
          showFeatures: z.boolean().optional(),
          showTestimonials: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let websiteSettings = await WebsiteSettingsModel.findOne({
        domain: ctx.domainData.domainObj._id,
      });

      if (!websiteSettings) {
        // Create new settings if none exist
        websiteSettings = new WebsiteSettingsModel({
          ...input.data,
          domain: ctx.domainData.domainObj._id,
        });
      } else {
        // Update existing settings
        Object.assign(websiteSettings, input.data);
        websiteSettings.updatedAt = new Date();
      }

      await websiteSettings.save();

      // Update Redis cache
      await WebsiteSettingsManager.add(ctx.domainData.domainObj._id.toString(), websiteSettings.toObject());

      return websiteSettings;
    }),
});
