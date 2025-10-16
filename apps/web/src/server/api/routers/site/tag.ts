import {
  ConflictException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  adminProcedure,
  createDomainRequiredMiddleware,
  publicProcedure
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { TagModel } from "@workspace/common-logic/models/post/tag.model";
import { slugify } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

export const tagRouter = router({
  list: adminProcedure
    .use(createDomainRequiredMiddleware())
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof TagModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };

      if (input.search?.q) {
        query.$text = { $search: input.search.q };
      }

      const paginationMeta = paginate(input.pagination);
      console.log(paginationMeta);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };

      const [items, total] = await Promise.all([
        TagModel.find(query)
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? TagModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  getById: adminProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ id: documentIdValidator() }))
    .query(async ({ ctx, input }) => {
      const tag = await TagModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      if (!tag) {
        throw new NotFoundException("Tag", input.id);
      }

      return jsonify(tag);
    }),

  create: adminProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.data.name);

      const existingTag = await TagModel.findOne({
        slug,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (existingTag) {
        throw new ConflictException("Tag with this name already exists");
      }

      const tag = await TagModel.create({
        name: input.data.name,
        slug,
        orgId: ctx.domainData.domainObj.orgId,
      });

      return jsonify(tag.toObject());
    }),

  update: adminProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema(
        {
          name: z.string().min(1).max(100),
        },
        {
          id: documentIdValidator(),
        },
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const tag = await TagModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!tag) {
        throw new NotFoundException("Tag", input.id);
      }

      const slug = slugify(input.data.name);

      const existingTag = await TagModel.findOne({
        slug,
        orgId: ctx.domainData.domainObj.orgId,
        _id: { $ne: input.id },
      });

      if (existingTag) {
        throw new ConflictException("Tag with this name already exists");
      }

      tag.name = input.data.name;
      tag.slug = slug;

      const saved = await tag.save();
      return jsonify(saved.toObject());
    }),

  delete: adminProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ id: documentIdValidator() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await TagModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!tag) {
        throw new NotFoundException("Tag", input.id);
      }

      await tag.deleteOne();
      return { success: true };
    }),

  publicList: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof TagModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };
      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };
      const tags = await TagModel.find(query).skip(paginationMeta.skip).limit(paginationMeta.take).sort(sortObject).lean();
      return jsonify({
        items: tags,
        total: tags.length,
        meta: paginationMeta,
      });
    }),
});

