import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import {
  ExternalApiKeyModel,
  IExternalApiKeyHydratedDocument,
} from "@workspace/common-logic/models/api/external-api-key.model";
import { ExternalApiKeyStatusEnum } from "@workspace/common-logic/models/api/external-api-key.types";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import { createHash } from "crypto";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

export const externalApiKeyRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      const query: RootFilterQuery<typeof ExternalApiKeyModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };

      if (!isAdmin) {
        query.ownerId = ctx.user._id;
      }

      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };

      const [items, total] = await Promise.all([
        ExternalApiKeyModel.find(query)
          .populate<{
            owner: Pick<IUserHydratedDocument, "username" | "fullName" | "email">;
          }>("owner", "username fullName email")
          .select("-secretKeyHash")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? ExternalApiKeyModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  getById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ id: documentIdValidator() }))
    .query(async ({ ctx, input }) => {
      const apiKey = await ExternalApiKeyModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .populate<{
          owner: Pick<IUserHydratedDocument, "username" | "fullName" | "email">;
        }>("owner", "username fullName email")
        .select("-secretKeyHash")
        .lean();

      if (!apiKey) {
        throw new NotFoundException("External API Key", input.id);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !apiKey.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      return jsonify(apiKey);
    }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255),
        publicKey: z.string().min(1, "Public key is required"),
        secretKey: z.string().min(1, "Secret key is required"),
        description: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
        isSelf: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && input.data.isSelf) {
        throw new AuthorizationException(
          "Only admins can create self API keys",
        );
      }

      // Hash the provided secret key for secure storage
      const secretKeyHash = createHash("sha256").update(input.data.secretKey).digest("hex");

      const apiKey = await ExternalApiKeyModel.create({
        title: input.data.title,
        publicKey: input.data.publicKey,
        description: input.data.description,
        secretKeyHash,
        expiresAt: input.data.expiresAt
          ? new Date(input.data.expiresAt)
          : undefined,
        isSelf: input.data.isSelf || false,
        status: ExternalApiKeyStatusEnum.ACTIVE,
        orgId: ctx.domainData.domainObj.orgId,
        ownerId: ctx.user._id,
      });

      return jsonify(apiKey.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema(
        {
          title: z.string().min(1).max(255).optional(),
          publicKey: z.string().min(1).optional(),
          secretKey: z.string().min(1).optional(),
          description: z.string().optional(),
          status: z.nativeEnum(ExternalApiKeyStatusEnum).optional(),
          expiresAt: z.string().datetime().optional(),
        },
        {
          id: documentIdValidator(),
        },
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ExternalApiKeyModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!apiKey) {
        throw new NotFoundException("External API Key", input.id);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !apiKey.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      if (input.data.title !== undefined) apiKey.title = input.data.title;
      if (input.data.publicKey !== undefined) apiKey.publicKey = input.data.publicKey;
      if (input.data.secretKey !== undefined) {
        // Hash new secret key if provided
        apiKey.secretKeyHash = createHash("sha256").update(input.data.secretKey).digest("hex");
      }
      if (input.data.description !== undefined)
        apiKey.description = input.data.description;
      if (input.data.status !== undefined) apiKey.status = input.data.status;
      if (input.data.expiresAt !== undefined)
        apiKey.expiresAt = new Date(input.data.expiresAt);

      const saved = await apiKey.save();
      return jsonify(saved.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ id: documentIdValidator() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ExternalApiKeyModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!apiKey) {
        throw new NotFoundException("External API Key", input.id);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !apiKey.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      await ExternalApiKeyModel.deleteOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      return { success: true };
    }),

  revoke: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ id: documentIdValidator() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ExternalApiKeyModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!apiKey) {
        throw new NotFoundException("External API Key", input.id);
      }

      const isAdmin = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageSite,
      ]);

      if (!isAdmin && !apiKey.ownerId.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      apiKey.status = ExternalApiKeyStatusEnum.REVOKED;
      const saved = await apiKey.save();

      return jsonify(saved.toObject());
    }),
});

