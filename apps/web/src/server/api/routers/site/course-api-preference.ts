import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import {
  CourseApiPreferenceModel,
} from "@workspace/common-logic/models/api/course-api-preference.model";
import {
  ExternalApiKeyModel,
  IExternalApiKeyHydratedDocument,
} from "@workspace/common-logic/models/api/external-api-key.model";
import { ExternalApiKeyStatusEnum } from "@workspace/common-logic/models/api/external-api-key.types";
import { checkPermission } from "@workspace/utils";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import mongoose from "mongoose";
import { z } from "zod";

export const courseApiPreferenceRouter = router({
  // Get preference for a specific course
  getByCourseId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ courseId: documentIdValidator() }))
    .query(async ({ ctx, input }) => {
      const preference = await CourseApiPreferenceModel.findOne({
        courseId: input.courseId,
        orgId: ctx.domainData.domainObj.orgId,
        isActive: true,
      })
        .populate<{
          externalApiKey: Pick<IExternalApiKeyHydratedDocument, "publicKey" | "title" | "status">;
        }>("externalApiKey", "publicKey title status")
        .lean();

      if (!preference) {
        return null;
      }

      // Return API key credentials if status is active
      if (preference.externalApiKey?.status === ExternalApiKeyStatusEnum.ACTIVE) {
        return jsonify({
          ...preference,
          apiKey: {
            publicKey: preference.externalApiKey.publicKey,
            title: preference.externalApiKey.title,
          },
        });
      }

      return null;
    }),

  // Set or update preference for a course
  setForCourse: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        courseId: documentIdValidator(),
        externalApiKeyId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify API key exists and user has access
      const apiKey = await ExternalApiKeyModel.findOne({
        _id: input.data.externalApiKeyId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!apiKey) {
        throw new NotFoundException("External API Key", input.data.externalApiKeyId);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !apiKey.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException("You don't have access to this API key");
      }

      // Check if preference already exists
      const existing = await CourseApiPreferenceModel.findOne({
        courseId: input.data.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (existing) {
        // Update existing
        existing.externalApiKeyId = new mongoose.Types.ObjectId(input.data.externalApiKeyId) as any;
        existing.ownerId = ctx.user._id;
        existing.isActive = true;
        const saved = await existing.save();
        return jsonify(saved.toObject());
      } else {
        // Create new
        const preference = await CourseApiPreferenceModel.create({
          orgId: ctx.domainData.domainObj.orgId,
          ownerId: ctx.user._id,
          courseId: input.data.courseId,
          externalApiKeyId: input.data.externalApiKeyId,
          isActive: true,
        });
        return jsonify(preference.toObject());
      }
    }),

  // Remove preference for a course
  removeForCourse: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ courseId: documentIdValidator() }))
    .mutation(async ({ ctx, input }) => {
      const preference = await CourseApiPreferenceModel.findOne({
        courseId: input.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!preference) {
        throw new NotFoundException("Course API Preference", input.courseId);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !preference.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      await CourseApiPreferenceModel.deleteOne({
        _id: preference._id,
      });

      return { success: true };
    }),
});

