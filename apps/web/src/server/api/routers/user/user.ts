import { responses } from "@/config/strings";
import { checkForInvalidPermissions } from "@/lib/check-invalid-permissions";
import { Log } from "@/lib/logger";
import { generateEmailFrom } from "@/lib/utils";
import CommunityModel from "@/models/Community";
import CourseModel from "@/models/Course";
import MembershipModel from "@/models/Membership";
import UserModel from "@/models/User";
import { addMailJob } from "@/server/lib/queue";
import courseEnrollTemplate from "@/server/services/mail/templates/course-enroll";
import { TRPCError } from "@trpc/server";
import {
  Constants,
  MembershipEntityType,
  UIConstants,
  User,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import mongoose from "mongoose";
import pug from "pug";
import { z } from "zod";
import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
} from "../../core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
} from "../../core/procedures";
import { getFormDataSchema, ListInputSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { paginate } from "../../core/utils";
import { mediaWrappedFieldValidator } from "../../core/validators";
import { getInternalPaymentPlan } from "../community/helpers";
import { getCourseOrThrow } from "../lms/course/helpers";
import { activateMembership } from "../payment/helpers";
import { addTags, createUser } from "./helpers";

const { permissions } = UIConstants;

const removeAdminFieldsFromUserObject = (user: User) => ({
  name: user.name,
  userId: user.userId,
  bio: user.bio,
  email: user.email,
  avatar: user.avatar,
  tags: user.tags,
  active: user.active,
});
const validateUserProperties = (user: User) => {
  checkForInvalidPermissions(user.permissions);
};
async function getUserContentInternal(ctx: MainContextType, user: User) {
  const memberships = await MembershipModel.find({
    domain: ctx.domainData.domainObj._id,
    userId: user.userId,
    status: Constants.MembershipStatus.ACTIVE,
  });

  const content: Record<string, unknown>[] = [];

  for (const membership of memberships) {
    if (membership.entityType === Constants.MembershipEntityType.COURSE) {
      const course = await CourseModel.findOne({
        courseId: membership.entityId,
        domain: ctx.domainData.domainObj._id,
      });

      if (course) {
        content.push({
          entityType: Constants.MembershipEntityType.COURSE,
          entity: {
            id: course.courseId,
            title: course.title,
            slug: course.slug,
            type: course.type,
            totalLessons: course.lessons.length,
            completedLessonsCount: user.purchases.find(
              (progress) => progress.courseId === course.courseId,
            )?.completedLessons.length,
            featuredImage: course.featuredImage,
          },
        });
      }
    }
    if (membership.entityType === Constants.MembershipEntityType.COMMUNITY) {
      const community = await CommunityModel.findOne({
        communityId: membership.entityId,
        domain: ctx.domainData.domainObj._id,
        deleted: false,
      });

      if (community) {
        content.push({
          entityType: Constants.MembershipEntityType.COMMUNITY,
          entity: {
            id: community.communityId,
            title: community.name,
            featuredImage: community.featuredImage,
          },
        });
      }
    }
  }

  return content;
}

const updateUser = async (
  userData: {
    userId: string;
    tags?: string[];
    name?: string;
    email?: string;
    active?: boolean;
    permissions?: string[];
    subscribedToUpdates?: boolean;
  },
  ctx: MainContextType,
) => {
  const keys = Object.keys(userData);
  const hasPermissionToManageUser = checkPermission(ctx.user.permissions, [
    permissions.manageUsers,
  ]);
  const isModifyingSelf = userData.userId === ctx.user.userId;
  const restrictedKeys = ["permissions", "active"];
  if (
    (isModifyingSelf && keys.some((key) => restrictedKeys.includes(key))) ||
    (!isModifyingSelf && !hasPermissionToManageUser)
  ) {
    throw new AuthorizationException();
  }

  let user = await UserModel.findOne({
    userId: userData.userId,
    domain: ctx.domainData.domainObj._id,
  });
  if (!user) throw new NotFoundException("User not found");

  for (const key of keys.filter((key) => key !== "id")) {
    if (key === "tags") {
      addTags(userData["tags"]!, ctx);
    }

    (user as any)[key] = (userData as any)[key];
  }

  validateUserProperties(user);

  user = await user.save();
  if (userData.name) {
    await CourseModel.updateMany(
      {
        creatorId: user.userId,
      },
      {
        creatorName: user.name || "",
      },
    );
  }
  return user;
};
export const getMembership = async ({
  domainId,
  userId,
  entityType,
  entityId,
  planId,
}: {
  domainId: mongoose.Types.ObjectId;
  userId: string;
  entityType: MembershipEntityType;
  entityId: string;
  planId: string;
}) => {
  const existingMembership = await MembershipModel.findOne({
    domain: domainId,
    userId,
    entityType,
    entityId,
  });

  let membership =
    existingMembership ||
    (await MembershipModel.create({
      domain: domainId,
      userId,
      paymentPlanId: planId,
      entityId,
      entityType,
      status: Constants.MembershipStatus.PENDING,
    }));

  return membership;
};

export const userRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageUsers]))
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const q = input?.search?.q;
      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };

      const query = q
        ? {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { email: { $regex: q, $options: "i" } },
            ],
            domain: ctx.domainData.domainObj._id,
          }
        : { domain: ctx.domainData.domainObj._id };

      const [items, total] = await Promise.all([
        UserModel.find(query)
          .select({
            userId: 1,
            name: 1,
            email: 1,
            permissions: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            avatar: 1,
            purchases: 1,
          })
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject),
        paginationMeta.includePaginationCount
          ? UserModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return {
        // items,
        items: await Promise.all(
          items.map(async (i) => ({
            ...i.toJSON(),
            content: await getUserContentInternal(ctx as any, i),
          })),
        ),
        total,
        meta: paginationMeta,
      };
    }),
  // Get user profile data from MongoDB
  getProfileProtected: protectedProcedure.query(async ({ ctx }) => {
    const user = await UserModel.findOne({
      userId: ctx.session.user.userId,
    }).select({
      name: 1,
      _id: 1,
      email: 1,
      userId: 1,
      bio: 1,
      permissions: 1,
      purchases: 1,
      avatar: 1,
      subscribedToUpdates: 1,
      roles: 1,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      name: user.name,
      id: user._id.toString(),
      email: user.email,
      userId: user.userId,
      bio: user.bio,
      permissions: user.permissions || [],
      purchases:
        user.purchases?.map((purchase: any) => ({
          courseId: purchase.courseId,
          completedLessons: purchase.completedLessons || [],
          accessibleGroups: purchase.accessibleGroups || [],
        })) || [],
      avatar: user.avatar,
      subscribedToUpdates: user.subscribedToUpdates || false,
      roles: user.roles || [],
    };
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatar: mediaWrappedFieldValidator().nullable().optional(),
        subscribedToUpdates: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const userId = session.user.userId || session.user.id;

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.bio !== undefined) updateData.bio = input.bio;
      if (input.subscribedToUpdates !== undefined)
        updateData.subscribedToUpdates = input.subscribedToUpdates;
      if (input.avatar !== undefined) updateData.avatar = input.avatar;

      const updatedUser = await UserModel.findOneAndUpdate(
        { userId: userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        success: true,
        message: "Profile updated successfully",
        user: {
          name: updatedUser.name,
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          userId: updatedUser.userId,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar,
          subscribedToUpdates: updatedUser.subscribedToUpdates,
        },
      };
    }),

  getByUserId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ userId: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      let user: User | undefined | null;
      user = ctx.user;

      if (input.userId) {
        user = await UserModel.findOne({
          userId: input.userId,
          domain: ctx.domainData.domainObj._id,
        });
      }

      if (!user) {
        throw new NotFoundException("User not found");
      }

      if (
        ctx.user &&
        (user.userId === ctx.user.userId ||
          checkPermission(ctx.user.permissions, [permissions.manageUsers]))
      ) {
        return user;
      } else {
        return removeAdminFieldsFromUserObject(user);
      }
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        name: z.string().min(2).max(100).optional(),
        active: z.boolean().optional(),
        bio: z.string().max(500).optional(),
        permissions: z.array(z.string()).optional(),
        subscribedToUpdates: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        avatar: mediaWrappedFieldValidator().optional(),
        invited: z.boolean().optional(),
      }).extend({
        userId: z.string().min(2).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await updateUser(
        {
          ...input.data,
          userId: input.userId,
        },
        ctx,
      );
    }),

  inviteCustomer: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageUsers]))
    .input(
      getFormDataSchema({
        email: z.string(),
        tags: z.array(z.string()),
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = ctx.domainData.domainObj;
      const course = await getCourseOrThrow(
        undefined,
        ctx,
        input.data.courseId,
      );
      if (!course.published) {
        throw new ConflictException(
          responses.cannot_invite_to_unpublished_product,
        );
      }

      const sanitizedEmail = input.data.email.toLowerCase();
      let user = await UserModel.findOne({
        email: sanitizedEmail,
        domain: domain._id,
      });
      if (!user) {
        user = await createUser({
          domain: domain,
          email: sanitizedEmail,
          subscribedToUpdates: true,
          invited: true,
        });
      }

      if (input.data.tags.length) {
        user = await updateUser(
          {
            userId: user.userId,
            tags: Array.from(
              new Set([...(user.tags || []), ...input.data.tags]),
            ),
          },
          ctx as any,
        );
      }

      const paymentPlan = await getInternalPaymentPlan(
        ctx.domainData.domainObj._id.toString(),
      );

      if (!paymentPlan) {
        throw new ConflictException("Payment plan not found");
      }

      const membership = await getMembership({
        domainId: domain._id,
        userId: user.userId,
        entityType: Constants.MembershipEntityType.COURSE,
        entityId: course.courseId,
        planId: paymentPlan.planId,
      });

      if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return user;
      }

      await activateMembership(
        ctx.domainData.domainObj,
        membership as any,
        paymentPlan,
      );

      try {
        const address = ctx.domainData.headers.host;
        const emailBody = pug.render(courseEnrollTemplate, {
          courseName: course.title,
          loginLink: `${address}/login`,
          hideCourseLitBranding: domain.settings?.hideCourseLitBranding,
        });

        await addMailJob({
          to: [user.email],
          subject: `You have been invited to ${course.title}`,
          body: emailBody,
          from: generateEmailFrom({
            name: domain.settings?.title || domain.name,
            email: process.env.EMAIL_FROM || domain.email,
          }),
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        Log.error("Error sending email", error as Error);
      }

      return user;
    }),

  getMembershipStatus: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        entityId: z.string(),
        entityType: z.nativeEnum(Constants.MembershipEntityType),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { entityId, entityType } = input;

      const membership: any = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        entityId,
        entityType,
        userId: ctx.user.userId,
      });

      return membership ? membership.status : null;
    }),
});
