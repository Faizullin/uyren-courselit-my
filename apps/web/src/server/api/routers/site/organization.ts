import {
  NotFoundException,
  ResourceExistsException,
} from "@/server/api/core/exceptions";
import {
  adminProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { like, paginate } from "@/server/api/core/utils";
import {
  documentIdValidator,
  documentSlugValidator,
  toSlug,
} from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { OrganizationModel } from "@workspace/common-logic/models/organization.model";
import { z } from "zod";

async function ensureUniqueSlug(slug: string, excludeId?: string) {
  const existing = await OrganizationModel.findOne({
    slug,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (existing) {
    throw new ResourceExistsException("Organization", "slug", slug);
  }
}

async function ensureUniqueEmail(email: string, excludeId?: string) {
  const existing = await OrganizationModel.findOne({
    email,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (existing) {
    throw new ResourceExistsException("Organization", "email", email);
  }
}

export const organizationRouter = router({
  list: adminProcedure
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
            slug: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const q = input?.search?.q;
      const baseWhere: any = {
        ...(input?.filter?.name ? { name: like(input.filter.name) } : {}),
        ...(input?.filter?.email ? { email: like(input.filter.email) } : {}),
        ...(input?.filter?.slug ? { slug: like(input.filter.slug) } : {}),
        ...(q
          ? {
              $or: [
                { name: like(q) },
                { email: like(q) },
                { slug: like(q) },
                { description: like(q) },
              ],
            }
          : {}),
      };

      const paginationMeta = paginate(input?.pagination);
      const orderByConfig = input?.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderByConfig.field]: orderByConfig.direction === "asc" ? 1 : -1,
      };

      const [items, total] = await Promise.all([
        OrganizationModel.find(baseWhere)
          .sort(sortObject)
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .lean(),
        paginationMeta.includePaginationCount
          ? OrganizationModel.countDocuments(baseWhere)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  getById: adminProcedure
    .input(z.object({ id: documentIdValidator() }))
    .query(async ({ input }) => {
      const organization = await OrganizationModel.findById(input.id).lean();

      if (!organization) {
        throw new NotFoundException("Organization", input.id);
      }

      return jsonify(organization);
    }),

  getBySlug: adminProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const organization = await OrganizationModel.findOne({
        slug: input.slug,
      }).lean();

      if (!organization) {
        throw new NotFoundException("Organization", input.slug);
      }

      return jsonify(organization);
    }),

  create: adminProcedure
    .input(
      getFormDataSchema({
        name: z.string().min(1, "Name is required").max(255),
        slug: documentSlugValidator().transform(toSlug),
        email: z.string().email("Invalid email address"),
        description: z.string().max(1000).optional(),
        phone: z.string().max(50).optional(),
        address: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureUniqueSlug(input.data.slug);
      await ensureUniqueEmail(input.data.email);

      const organization = await OrganizationModel.create({
        name: input.data.name,
        slug: input.data.slug,
        email: input.data.email,
        description: input.data.description,
        phone: input.data.phone,
        address: input.data.address,
      });

      return jsonify(organization.toObject());
    }),

  update: adminProcedure
    .input(
      getFormDataSchema(
        {
          name: z.string().min(1, "Name is required").max(255).optional(),
          slug: documentSlugValidator().transform(toSlug).optional(),
          email: z.string().email("Invalid email address").optional(),
          description: z.string().max(1000).optional(),
          phone: z.string().max(50).optional(),
          address: z.string().max(500).optional(),
        },
        {
          id: documentIdValidator(),
        },
      ),
    )
    .mutation(async ({ input }) => {
      const existing = await OrganizationModel.findById(input.id);

      if (!existing) {
        throw new NotFoundException("Organization", input.id);
      }

      if (input.data.slug) {
        await ensureUniqueSlug(input.data.slug, input.id);
      }

      if (input.data.email) {
        await ensureUniqueEmail(input.data.email, input.id);
      }

      Object.keys(input.data).forEach((key) => {
        (existing as any)[key] = (input.data as any)[key];
      });

      const saved = await existing.save();

      return jsonify(saved.toObject());
    }),

  delete: adminProcedure
    .input(z.object({ id: documentIdValidator() }))
    .mutation(async ({ input }) => {
      const existing = await OrganizationModel.findById(input.id);

      if (!existing) {
        throw new NotFoundException("Organization", input.id);
      }

      await OrganizationModel.deleteOne({ _id: input.id });

      return { success: true };
    }),

  count: adminProcedure
    .input(
      z.object({
        filter: z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const baseWhere: any = {
        ...(input?.filter?.name ? { name: like(input.filter.name) } : {}),
        ...(input?.filter?.email ? { email: like(input.filter.email) } : {}),
      };

      const count = await OrganizationModel.countDocuments(baseWhere);

      return { count };
    }),
});

