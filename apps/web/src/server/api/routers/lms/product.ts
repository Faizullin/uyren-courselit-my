import constants from "@/config/constants";
import CourseModel from "@/models/Course";
import {
  createDomainRequiredMiddleware,
  MainContextType,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import { ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { InternalCourse } from "@workspace/common-logic";
import {
  Constants,
  Course,
  PaymentPlan,
  ProductAccessType,
  UIConstants,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";
import { getActivities } from "../activity/helpers";
import { getPlans } from "../community/helpers";
import { buildMongooseQuery } from "../../core/utils";
import MembershipModel from "@/models/Membership";

const { permissions } = UIConstants;

const getProductsQuery = (
  ctx: MainContextType,
  filter?: ("course" | "download" | "blog")[],
  tags?: string[],
  ids?: string[],
  publicView: boolean = false,
  level?: "beginner" | "intermediate" | "advanced",
) => {
  const query: RootFilterQuery<typeof CourseModel> = {
    domain: ctx.domainData.domainObj._id,
  };

  if (
    !publicView &&
    ctx.user &&
    checkPermission(ctx.user.permissions, [
      permissions.manageAnyCourse,
      permissions.manageCourse,
    ])
  ) {
    if (checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
      // do nothing
    } else {
      query.creatorId = ctx.user.userId;
    }
  } else {
    query.published = true;
    query.privacy = Constants.ProductAccessType.PUBLIC;
  }

  if (filter) {
    query.type = { $in: filter };
  } else {
    query.type = { $in: [constants.download, constants.course] };
  }

  if (tags) {
    query.tags = { $in: tags };
  }

  if (ids) {
    query.courseId = {
      $in: ids,
    };
  }

  if (level) {
    query.level = level;
  }

  return query;
};

export const productRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            filterBy: z.array(z.nativeEnum(Constants.CourseType)).optional(),
            tags: z.array(z.string()).optional(),
            ids: z.array(z.string()).optional(),
            publicView: z.boolean().optional(),
          })
          .optional()
          .default({}),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = getProductsQuery(
        ctx as any,
        input.filter.filterBy,
        input.filter.tags,
        input.filter.ids,
        input.filter.publicView,
      );
      const response = await buildMongooseQuery(CourseModel, {
        filter: query,
        pagination: input.pagination,
        orderBy: input.orderBy,
      });
      const hasManagePerm =
        ctx.user &&
        checkPermission(ctx.user.permissions, [
          permissions.manageAnyCourse,
          permissions.manageCourse,
        ]);

      const products: Partial<
        Omit<InternalCourse, "paymentPlans"> & {
          paymentPlans: PaymentPlan[];
        }
      >[] = [];

      for (const course of response.items) {
        const customers =
          hasManagePerm && course.type !== constants.blog
            ? await MembershipModel.countDocuments({
                entityId: course.courseId,
                entityType: Constants.MembershipEntityType.COURSE,
                domain: ctx.domainData.domainObj._id,
                status: Constants.MembershipStatus.ACTIVE,
              })
            : undefined;
        const sales =
          hasManagePerm && course.type !== constants.blog
            ? (
                await getActivities({
                  entityId: course.courseId,
                  type: Constants.ActivityType.PURCHASED,
                  duration: "lifetime",
                  ctx: ctx as any,
                })
              ).count
            : undefined;
        const paymentPlans =
          course.type !== constants.blog
            ? await getPlans({
                planIds: course.paymentPlans,
                domainId: ctx.domainData.domainObj._id,
              })
            : undefined;
        products.push({
          title: course.title,
          slug: course.slug,
          description: course.description,
          type: course.type,
          creatorId: course.creatorId,
          creatorName: course.creatorName,
          updatedAt: course.updatedAt,
          featuredImage: course.featuredImage,
          courseId: course.courseId,
          tags: course.tags,
          privacy: course.privacy,
          published: course.published,
          isFeatured: course.isFeatured,
          groups: course.type !== constants.blog ? course.groups : [],
          pageId: course.type !== constants.blog ? course.pageId : undefined,
          customers: customers! as any,
          sales: sales!,
          paymentPlans: (paymentPlans || []) as PaymentPlan[],
          defaultPaymentPlan: course.defaultPaymentPlan,
        });
      }

      // const products = courses.map(async (course) => ({
      //     ...course,
      //     groups: course.type !== constants.blog ? course.groups : null,
      //     pageId: course.type !== constants.blog ? course.pageId : undefined,
      //     customers:
      //         hasManagePerm && course.type !== constants.blog
      //             ? await (MembershipModel as any).countDocuments({
      //                   entityId: course.courseId,
      //                   entityType: Constants.MembershipEntityType.COURSE,
      //                   domain: ctx.subdomain._id,
      //               })
      //             : undefined,
      //     sales:
      //         hasManagePerm && course.type !== constants.blog
      //             ? (
      //                   await getActivities({
      //                       entityId: course.courseId,
      //                       type: ActivityType.PURCHASED,
      //                       duration: "lifetime",
      //                       ctx,
      //                   })
      //               ).count
      //             : undefined,
      // }));

      return {
        ...response,
        items: products,
      };
    }),

  publicList: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            type: z.array(z.nativeEnum(Constants.CourseType)).optional(),
            tags: z.array(z.string()).optional(),
            ids: z.array(z.string()).optional(),
            level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
          })
          .optional()
          .default({}),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = getProductsQuery(
        ctx as any,
        input.filter.type,
        input.filter.tags,
        input.filter.ids,
        true,
        input.filter.level,
      );

      if (input.search?.q) {
        query.$or = [
          { title: { $regex: input.search.q, $options: "i" } },
          { description: { $regex: input.search.q, $options: "i" } },
          { tags: { $regex: input.search.q, $options: "i" } },
        ];
      }

      const response = await buildMongooseQuery(CourseModel, {
        filter: query,
        pagination: input.pagination,
        orderBy: input.orderBy,
      });

      const products: (Pick<
        InternalCourse,
        | "title"
        | "slug"
        | "type"
        | "creatorId"
        | "updatedAt"
        | "featuredImage"
        | "courseId"
        | "tags"
        | "published"
        | "isFeatured"
        | "groups"
        | "pageId"
        | "level"
        | "duration"
        | "shortDescription"
      > & {
        paymentPlans: PaymentPlan[];
        lessonsCount: number;
      })[] = [];

      for (const course of response.items) {
        const paymentPlans = await getPlans({
          planIds: course.paymentPlans,
          domainId: ctx.domainData.domainObj._id,
        });

        products.push({
          title: course.title,
          slug: course.slug,
          type: course.type,
          creatorId: course.creatorId,
          updatedAt: course.updatedAt,
          featuredImage: course.featuredImage,
          courseId: course.courseId,
          tags: course.tags,
          published: course.published,
          isFeatured: course.isFeatured,
          groups: course.type !== constants.blog ? course.groups : [],
          pageId: course.type !== constants.blog ? course.pageId : undefined,
          paymentPlans: (paymentPlans || []) as PaymentPlan[],
          lessonsCount: course.lessons.length,
          level: course.level,
          duration: course.duration,
          shortDescription: course.shortDescription,
        });
      }

      return {
        ...response,
        items: products,
      };
    }),
});
