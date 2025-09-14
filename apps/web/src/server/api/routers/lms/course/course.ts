import constants from "@/config/constants";
import { internal, responses } from "@/config/strings";
import { Log } from "@/lib/logger";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import MembershipModel from "@/models/Membership";
import UserModel from "@/models/User";
import {
  ConflictException,
  NotFoundException,
  AuthorizationException,
} from "@/server/api/core/exceptions";
import { checkOwnershipWithoutModel } from "@/server/api/core/permissions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import {
  getFormDataSchema,
  ListInputSchema,
  PaginationSchema,
} from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import {
  documentIdValidator,
  mediaWrappedFieldValidator,
  textEditorContentValidator,
} from "@/server/api/core/validators";
import { deleteMedia } from "@/server/services/media";
import { InternalCourse } from "@workspace/common-logic";
import {
  Constants,
  Drip,
  Group,
  Lesson,
  Media,
  PaymentPlan,
  UIConstants,
} from "@workspace/common-models";
import { checkPermission, generateUniqueId, slugify } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { ActivityType } from "node_modules/@workspace/common-models/src/constants";
import { z } from "zod";
import { getActivities } from "../../activity/helpers";
import { getPlans, getInternalPaymentPlan } from "../../community/helpers";
import { activateMembership } from "../../payment/helpers";
import { recordActivity } from "@/lib/record-activity";
import {
  deleteAllLessons,
  getCourseOrThrow,
  getPrevNextCursor,
} from "./helpers";

const { permissions } = UIConstants;

async function formatCourse(
  courseId: string | InternalCourse,
  ctx: {
    domainData: { domainObj: { _id: mongoose.Types.ObjectId } };
  },
) {
  const find = async () => {
    if (typeof courseId === "string") {
      const course = await CourseModel.findOne({
        courseId,
        domain: ctx.domainData.domainObj._id,
      }).lean();

      if (!course) {
        throw new Error("Course not found");
      }
      return course;
    } else {
      return courseId;
    }
  };
  let course = await find();

  const paymentPlans = await getPlans({
    planIds: course!.paymentPlans,
    domainId: ctx.domainData.domainObj._id,
  });

  if (
    [Constants.CourseType.COURSE, Constants.CourseType.DOWNLOAD].includes(
      course.type as any,
    )
  ) {
    const { nextLesson } = await getPrevNextCursor(
      course.courseId,
      ctx.domainData.domainObj._id,
    );
    (course as any).firstLesson = nextLesson;
  }

  const result = {
    ...course,
    paymentPlans,
  };
  return result;
}

const addGroup = async ({
  courseId,
  name,
  collapsed,
  ctx,
}: {
  courseId: string;
  name: string;
  collapsed: boolean;
  ctx: MainContextType;
}) => {
  const course = await getCourseOrThrow(undefined, ctx, courseId);
  if (
    course.type === Constants.CourseType.DOWNLOAD &&
    course.groups.length === 1
  ) {
    throw new ConflictException(responses.download_course_cannot_have_groups);
  }

  if (course.groups.some((group) => group.name === name)) {
    throw new ConflictException(responses.existing_group);
  }

  const maximumRank = course.groups?.reduce(
    (acc: number, value: { rank: number }) =>
      value.rank > acc ? value.rank : acc,
    0,
  );
  course.groups.push({
    rank: maximumRank + 1000,
    name,
    groupId: generateUniqueId(),
    collapsed,
    lessonsOrder: [],
  });
  await course.save();

  return await formatCourse(course.courseId, ctx);
};

const removeGroup = async (
  id: string,
  courseId: string,
  ctx: MainContextType,
) => {
  const course = await getCourseOrThrow(undefined, ctx, courseId);
  const group = course.groups?.find((group) => group.groupId === id);

  if (!group) {
    throw new ConflictException("Group not found");
  }

  if (
    course.type === Constants.CourseType.DOWNLOAD &&
    course.groups?.length === 1
  ) {
    throw new ConflictException(
      responses.download_course_last_group_cannot_be_removed,
    );
  }

  const countOfAssociatedLessons = await LessonModel.countDocuments({
    courseId,
    groupId: group.groupId,
    domain: ctx.domainData.domainObj._id,
  });

  if (countOfAssociatedLessons > 0) {
    throw new ConflictException(responses.group_not_empty);
  }

  // pull group
  course.groups = course.groups.filter((group) => group.groupId !== id);

  await course.save();

  await UserModel.updateMany(
    {
      domain: ctx.domainData.domainObj._id,
    },
    {
      $pull: {
        "purchases.$[elem].accessibleGroups": id,
      },
    },
    {
      arrayFilters: [{ "elem.courseId": courseId }],
    },
  );

  return await formatCourse(course.courseId, ctx);
};

const updateGroup = async ({
  groupId,
  courseId,
  name,
  rank,
  collapsed,
  lessonsOrder,
  drip,
  ctx,
}: {
  groupId: string;
  courseId: string;
  name?: string;
  rank?: number;
  collapsed?: boolean;
  lessonsOrder?: string[];
  drip?: Drip;
  ctx: MainContextType;
}) => {
  const course = await getCourseOrThrow(undefined, ctx, courseId);

  const $set: any = {};
  if (name) {
    const existingName = (group: Group) =>
      group.name === name && group.groupId.toString() !== groupId;

    if (course.groups?.some(existingName)) {
      throw new ConflictException(responses.existing_group);
    }

    $set["groups.$.name"] = name;
  }

  if (rank) {
    $set["groups.$.rank"] = rank;
  }

  if (
    lessonsOrder &&
    lessonsOrder.every((lessonId) => course.lessons?.includes(lessonId)) &&
    lessonsOrder.every((lessonId) =>
      course.groups
        ?.find((group) => group.groupId === groupId)
        ?.lessonsOrder.includes(lessonId),
    )
  ) {
    $set["groups.$.lessonsOrder"] = lessonsOrder;
  }

  if (typeof collapsed === "boolean") {
    $set["groups.$.collapsed"] = collapsed;
  }


  return await CourseModel.findOneAndUpdate(
    {
      domain: ctx.domainData.domainObj._id,
      courseId: course.courseId,
      "groups.groupId": groupId,
    },
    { $set },
    { new: true },
  );
};
const setupCourse = async ({
  title,
  type,
  ctx,
}: {
  title: string;
  type: "course" | "download";
  ctx: MainContextType;
}) => {
  const course = await CourseModel.create({
    domain: ctx.domainData.domainObj._id,
    title: title,
    cost: 0,
    costType: constants.costFree,
    privacy: constants.unlisted,
    creatorId: ctx.user.userId,
    creatorName: ctx.user.name,
    slug: slugify(title.toLowerCase()),
    type: type,
    duration: 0,
    level: "beginner",
  });
  await addGroup({
    courseId: course.courseId,
    name: internal.default_group_name,
    collapsed: false,
    ctx,
  });

  return course;
};
const setupBlog = async ({
  title,
  ctx,
}: {
  title: string;
  ctx: MainContextType;
}) => {
  const course = await CourseModel.create({
    domain: ctx.domainData.domainObj._id,
    title: title,
    cost: 0,
    costType: constants.costFree,
    privacy: constants.unlisted,
    creatorId: ctx.user.userId,
    creatorName: ctx.user.name,
    slug: slugify(title.toLowerCase()),
    type: constants.blog,
  });

  return course;
};

export const courseRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]),
    )
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            type: z.string().optional(),
          })
          .optional()
          .default({}),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: Partial<Omit<InternalCourse, "type">> & {
        $text?: Record<string, unknown>;
        type?: string | { $in: string[] };
      } = {
        domain: ctx.domainData.domainObj._id,
      };
      if (
        !checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageAnyCourse,
        ])
      ) {
        query.creatorId = `${ctx.user.userId || ctx.user._id}`;
      }
      if (input.filter.type) {
        query.type = { $in: [input.filter.type] };
      } else {
        query.type = { $in: [constants.download, constants.course] };
      }
      if (input.search?.q) query.$text = { $search: input.search.q };
      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };
      const [items, total] = await Promise.all([
        CourseModel.find(query as any)
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? CourseModel.countDocuments(query as any)
          : Promise.resolve(null),
      ]);

      const data = await Promise.all(
        items.map(async (course) => ({
          ...course,
          customers: await MembershipModel.countDocuments({
            entityId: course.courseId,
            entityType: Constants.MembershipEntityType.COURSE,
            domain: ctx.domainData.domainObj._id,
          }),
          sales: (
            await getActivities({
              entityId: course.courseId,
              type: ActivityType.PURCHASED,
              duration: "lifetime",
              ctx: ctx as any,
            })
          ).count,
        })),
      );

      return {
        items: data,
        total,
        meta: paginationMeta,
      };
    }),

  getByCourseId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: z.string(),
        asGuest: z.boolean().optional().default(false),
        withLessons: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        courseId: input.courseId,
        domain: ctx.domainData.domainObj._id,
      }).lean();

      if (!course) {
        throw new NotFoundException("Course", String(input.courseId));
      }

      if (ctx.user && !input.asGuest) {
        const isOwner =
          checkPermission(ctx.user.permissions, [
            UIConstants.permissions.manageAnyCourse,
          ]) || checkOwnershipWithoutModel(course, ctx);

        if (isOwner) {
          return await formatCourse(course.courseId, ctx);
        }
      }

      if (!course.published) {
        throw new NotFoundException("Course", String(input.courseId));
      }
      return await formatCourse(course.courseId, ctx);
    }),

  getByCourseDetailed: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: z.string(),
        asGuest: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        courseId: input.courseId,
        domain: ctx.domainData.domainObj._id,
      })
        .populate<{
          attachedLessons: Array<
            Pick<Lesson, "lessonId" | "type" | "title" | "groupId"> & {
              id: string;
            }
          >;
        }>({
          path: "attachedLessons",
          select: "lessonId type title groupId -_id",
        })
        .populate<{
          attachedPaymentPlans: Array<PaymentPlan>;
        }>({
          path: "attachedPaymentPlans",
          // select: "planId name type -_id",
        })
        .populate<{
          attachedTheme: {
            _id: string;
            name: string;
          };
        }>({
          path: "attachedTheme",
          select: "name _id",
        })
        .lean();

      if (!course) {
        throw new NotFoundException("Course", String(input.courseId));
      }

      if (ctx.user && !input.asGuest) {
        const isOwner =
          checkPermission(ctx.user.permissions, [
            UIConstants.permissions.manageAnyCourse,
          ]) || checkOwnershipWithoutModel(course, ctx);

        if (isOwner) {
          return course;
        }
      }

      if (!course.published) {
        throw new NotFoundException("Course", String(input.courseId));
      }

      return course;
    }),

  getMembers: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]),
    )
    .input(
      ListInputSchema.extend({
        filter: z.object({
          courseId: z.string(),
          status: z.nativeEnum(Constants.MembershipStatus).optional(),
        }),
        pagination: PaginationSchema.extend({
          take: z.number().max(10000).optional(),
        }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await getCourseOrThrow(
        undefined,
        ctx,
        input.filter.courseId,
      );

      const query: RootFilterQuery<typeof MembershipModel> = {
        domain: ctx.domainData.domainObj._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
      };

      if (input.filter.status) {
        query.status = input.filter.status;
      }
      if (input.search?.q) {
        query.$or = [
          { "user.name": { $regex: input.search?.q, $options: "i" } },
          { "user.email": { $regex: input.search?.q, $options: "i" } },
        ];
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
        MembershipModel.find(query)
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? MembershipModel.countDocuments(query as any)
          : Promise.resolve(null),
      ]);

      return {
        items: await Promise.all(
          items.map(async (member) => {
            const user = await UserModel.findOne({
              domain: ctx.domainData.domainObj._id,
              userId: member.userId,
            }).lean();
            const purchase = user?.purchases?.find(
              (purchase) => purchase.courseId === course.courseId,
            );
            return {
              membershipId: member.membershipId,
              userId: member.userId,
              status: member.status,
              subscriptionMethod: member.subscriptionMethod,
              subscriptionId: member.subscriptionId,
              joiningReason: member.joiningReason,
              completedLessons: purchase?.completedLessons,
              createdAt: purchase?.createdAt,
              updatedAt: purchase?.updatedAt,
              downloaded: purchase?.downloaded,
              user: user
                ? {
                    userId: user.userId,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                  }
                : undefined,
            };
          }),
        ),
        total,
        meta: paginationMeta,
      };
    }),

  approveMember: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]),
    )
    .input(
      getFormDataSchema({
        courseId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow(
        undefined,
        ctx,
        input.data.courseId,
      );
      const membership = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        userId: input.data.userId,
      });
      if (!membership) {
        throw new NotFoundException("Membership", input.data.userId);
      }
      if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return { ok: true };
      }
      const paymentPlan = await getInternalPaymentPlan(
        ctx.domainData.domainObj._id.toString(),
      );
      await activateMembership(
        ctx.domainData.domainObj,
        membership as any,
        paymentPlan || null,
      );
      return { ok: true };
    }),

  removeMember: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]),
    )
    .input(
      getFormDataSchema({
        courseId: z.string(),
        userId: z.string(),
        reason: z.string().optional(),
        forDelete: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow(
        undefined,
        ctx,
        input.data.courseId,
      );
      const membership = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        userId: input.data.userId,
      });
      if (!membership) {
        throw new NotFoundException("Membership", input.data.userId);
      }

      if (input.data.forDelete) {
        const hasElevated = checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageAnyCourse,
        ]);
        if (!hasElevated) {
          throw new AuthorizationException();
        }
        await MembershipModel.deleteOne({ _id: (membership as any)._id });
      } else {
        membership.status = Constants.MembershipStatus.REJECTED;
        if (input.data.reason) {
          membership.rejectionReason = input.data.reason;
        }
        await membership.save();
      }

      await UserModel.updateOne(
        {
          domain: ctx.domainData.domainObj._id,
          userId: input.data.userId,
        },
        {
          $pull: { purchases: { courseId: course.courseId } },
        },
      );

      await recordActivity({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        type: Constants.ActivityType.COURSE_ACCESS_REVOKED as any,
        entityId: course.courseId,
        metadata: {
          targetUserId: input.data.userId,
          reason: input.data.reason,
          forDelete: !!input.data.forDelete,
        },
      });

      return { ok: true };
    }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255),
        type: z.nativeEnum(Constants.CourseType),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.data.type === "blog") {
        return await setupBlog({
          title: input.data.title,
          ctx: ctx as any,
        });
      } else {
        return await setupCourse({
          title: input.data.title,
          type: input.data.type,
          ctx: ctx as any,
        });
      }
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255).optional(),
        // type: z.nativeEnum(Constants.CourseType).optional(),
        published: z.boolean().optional(),
        privacy: z.nativeEnum(Constants.ProductAccessType).optional(),
        shortDescription: z.string().optional(),
        description: textEditorContentValidator().optional(),
        featuredImage: mediaWrappedFieldValidator().nullable().optional(),
        themeId: z.string().nullish(),
        allowEnrollment: z.boolean().optional(),
      }).extend({
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow(undefined, ctx, input.courseId);
      checkOwnershipWithoutModel(course, ctx as any);
      const updateData = input.data;
      const updatedCourse = await CourseModel.findOneAndUpdate(
        { courseId: input.courseId },
        { $set: updateData },
        { new: true },
      );
      return updatedCourse;
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow(undefined, ctx, input.courseId);
      await deleteAllLessons(course.courseId, ctx as any);
      if (course.featuredImage) {
        try {
          await deleteMedia(course.featuredImage.mediaId);
        } catch (err: any) {
          Log.error(err.message, {
            stack: err.stack,
          });
        }
      }
      await CourseModel.deleteOne({
        domain: ctx.domainData.domainObj._id,
        courseId: course.courseId,
      });
      return true;
    }),

  addGroup: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        courseId: z.string(),
        name: z.string().min(1).max(255),
        collapsed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await addGroup({
        courseId: input.data.courseId,
        name: input.data.name,
        collapsed: input.data.collapsed ?? false,
        ctx: ctx as any,
      });
    }),

  updateGroup: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        groupId: z.string(),
        courseId: z.string(),
        name: z.string().optional(),
        rank: z.number().optional(),
        collapsed: z.boolean().optional(),
        lessonsOrder: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await updateGroup({
        groupId: input.data.groupId,
        courseId: input.data.courseId,
        name: input.data.name,
        rank: input.data.rank,
        collapsed: input.data.collapsed,
        lessonsOrder: input.data.lessonsOrder,
        ctx: ctx as any,
      });
    }),

  removeGroup: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        groupId: z.string(),
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await removeGroup(input.groupId, input.courseId, ctx as any);
    }),

  publicGetByCourseId: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        courseId: input.courseId,
        domain: ctx.domainData.domainObj._id,
        published: true, // Only published courses
      })
        .populate<{
          attachedLessons: Array<
            Pick<
              Lesson,
              "lessonId" | "type" | "title" | "groupId" | "requiresEnrollment"
            >
          >;
        }>({
          path: "attachedLessons",
          select: "lessonId type title groupId requiresEnrollment",
        })
        .lean();

      if (!course) {
        throw new NotFoundException("Course", String(input.courseId));
      }

      const paymentPlans = await getPlans({
        planIds: course.paymentPlans,
        domainId: ctx.domainData.domainObj._id,
      });

      return {
        courseId: course.courseId,
        title: course.title,
        description: course.description,
        type: course.type,
        level: course.level,
        duration: course.duration,
        cost: course.cost,
        costType: course.costType,
        featuredImage: course.featuredImage ? formatMedia(course.featuredImage) : null,
        published: course.published,
        isFeatured: course.isFeatured,
        tags: course.tags,
        sales: course.sales,
        creatorId: course.creatorId,
        creatorName: course.creatorName,
        slug: course.slug,
        privacy: course.privacy,
        themeId: course.themeId?.toString(),
        defaultPaymentPlan: course.defaultPaymentPlan,
        attachedPaymentPlans: paymentPlans.map(formatPaymentPlan),
        attachedLessons: course.attachedLessons.map(formatLesson),
        createdAt: course.createdAt,
        groups: course.groups,
        customers: course.customers,
        allowEnrollment: course.allowEnrollment,
      };
    }),
});

const formatMedia = (media: Media) => {
  return {
    mediaId: media.mediaId,
    url: media.url,
    thumbnail: media.thumbnail,
    originalFileName: media.originalFileName,
    mimeType: media.mimeType,
    size: media.size,
    access: media.access,
    caption: media.caption,
    storageProvider: media.storageProvider,
  };
};

const formatPaymentPlan = (paymentPlan: PaymentPlan) => {
  return {
    type: paymentPlan.type,
    name: paymentPlan.name,
    planId: paymentPlan.planId,
    oneTimeAmount: paymentPlan.oneTimeAmount,
    emiAmount: paymentPlan.emiAmount,
    emiTotalInstallments: paymentPlan.emiTotalInstallments,
    subscriptionMonthlyAmount: paymentPlan.subscriptionMonthlyAmount,
    subscriptionYearlyAmount: paymentPlan.subscriptionYearlyAmount,
  };
};

const formatLesson = (lesson: Partial<Lesson>) => {
  return {
    title: lesson.title!,
    type: lesson.type!,
    groupId: lesson.groupId!,
    lessonId: lesson.lessonId!,
    requiresEnrollment: lesson.requiresEnrollment!,
  };
};
