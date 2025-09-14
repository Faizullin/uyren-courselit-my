import { ThemeModel } from "@/models/lms";
import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import {
  BASIC_PUBLICATION_STATUS_TYPE,
  UIConstants,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

const { permissions } = UIConstants;

export const themeRouter = router({
  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        status: z
          .enum([
            BASIC_PUBLICATION_STATUS_TYPE.DRAFT,
            BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
            BASIC_PUBLICATION_STATUS_TYPE.ARCHIVED,
          ])
          .default(BASIC_PUBLICATION_STATUS_TYPE.DRAFT),
        assets: z
          .array(
            z.object({
              assetType: z.enum(["stylesheet", "font", "script", "image"]),
              url: z.string().url().optional(),
              content: z.string().optional(),
              preload: z.boolean().optional(),
              async: z.boolean().optional(),
              defer: z.boolean().optional(),
              media: z.string().optional(),
              crossorigin: z.string().optional(),
              integrity: z.string().optional(),
              rel: z.string().optional(),
              sizes: z.string().optional(),
              mimeType: z.string().optional(),
              name: z.string().optional(),
              description: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const theme = await ThemeModel.create({
        ...input.data,
        domain: ctx.domainData.domainObj._id,
        ownerId: ctx.user._id,
      });
      return theme;
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z
          .enum([
            BASIC_PUBLICATION_STATUS_TYPE.DRAFT,
            BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
            BASIC_PUBLICATION_STATUS_TYPE.ARCHIVED,
          ])
          .optional(),
        assets: z
          .array(
            z.object({
              assetType: z.enum(["stylesheet", "font", "script", "image"]),
              url: z.string().optional(),
              content: z.string().optional(),
              preload: z.boolean().optional(),
              async: z.boolean().optional(),
              defer: z.boolean().optional(),
              media: z.string().optional(),
              crossorigin: z.string().optional(),
              integrity: z.string().optional(),
              rel: z.string().optional(),
              sizes: z.string().optional(),
              mimeType: z.string().optional(),
              name: z.string().optional(),
              description: z.string().optional(),
            }),
          )
          .optional(),
      }).extend({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const theme = await ThemeModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!theme) throw new NotFoundException("Theme not found");
      Object.keys(input.data).forEach((key) => {
        (theme as any)[key] = (input.data as any)[key];
      });
      const json = (await theme.save()).toObject() as any;
      return {
        ...json,
      };
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const theme = await ThemeModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!theme) throw new NotFoundException("Theme not found");
      await ThemeModel.findByIdAndDelete(input);
      return { success: true };
    }),

  listAssets: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        themeId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const theme = await ThemeModel.findOne({
        _id: input.themeId,
        domain: ctx.domainData.domainObj._id,
      }).lean();

      if (!theme) throw new NotFoundException("Theme not found");

      return {
        assets: theme.assets || [],
        themeId: theme._id,
      };
    }),

  getById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const theme = await ThemeModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      }).lean();

      if (!theme) throw new NotFoundException("Theme not found");
      const hasAccess = checkPermission(ctx.user.permissions, [
        permissions.manageAnyCourse,
      ]);
      if (!hasAccess) throw new AuthorizationException("No access");
      return { ...theme };
    }),

  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            status: z
              .enum([
                BASIC_PUBLICATION_STATUS_TYPE.DRAFT,
                BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
                BASIC_PUBLICATION_STATUS_TYPE.ARCHIVED,
              ])
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof ThemeModel> = {
        domain: ctx.domainData.domainObj._id,
      };
      if (input.filter?.status) query.status = input.filter.status;
      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        ThemeModel.find(query)
          .skip(input.pagination?.skip || 0)
          .limit(input.pagination?.take || 20)
          .sort(
            input.orderBy
              ? {
                [input.orderBy.field]:
                  input.orderBy.direction === "asc" ? 1 : -1,
              }
              : { createdAt: -1 },
          )
          .lean(),
        includeCount ? ThemeModel.countDocuments(query) : Promise.resolve(0),
      ]);
      return {
        items: items.map((item) => ({
          ...item,
        })),
        total,
        meta: {
          includePaginationCount: input.pagination?.includePaginationCount,
          skip: input.pagination?.skip || 0,
          take: input.pagination?.take || 20,
        },
      };
    }),

  publicGetThemeAndAssets: publicProcedure
    .input(z.object({
      id: documentIdValidator(),
    }))
    .query(async ({ input }) => {
      const theme = await ThemeModel.findOne({
        _id: input.id,
      }).lean();
      if (!theme) throw new NotFoundException("Theme not found");
      return theme;
    }),
});
