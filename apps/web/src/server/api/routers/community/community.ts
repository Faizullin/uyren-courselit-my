import { internal, responses } from "@/config/strings";
import {
  getNextRoleForCommunityMember,
  getNextStatusForCommunityMember,
  hasCommunityPermission,
} from "@/lib/ui/lib/utils";
import CommunityModel, { InternalCommunity } from "@/models/community/Community";
import CommunityCommentModel from "@/models/community/CommunityComment";
import CommunityPostModel from "@/models/community/CommunityPost";
import CommunityReportModel, {
  InternalCommunityReport,
} from "@/models/community/CommunityReport";
import DomainModel from "@/models/Domain";
import MembershipModel from "@/models/Membership";
import PaymentPlanModel from "@/models/PaymentPlan";
import UserModel from "@/models/User";
import { addNotification } from "@/server/lib/queue";
import { getPaymentMethodFromSettings } from "@/server/services/payment";
import {
  Community,
  CommunityMedia,
  CommunityMemberStatus,
  CommunityReport,
  CommunityReportType,
  Constants,
  Membership,
  UIConstants,
  User,
} from "@workspace/common-models";
import { checkPermission, generateUniqueId, slugify } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";
import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
  ValidationException,
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
import { textEditorContentValidator } from "../../core/validators";
import {
  checkEntityPermission,
  fetchEntity,
  getCommunityObjOrAssert,
  getCommunityQuery,
  getMembership,
  getPlans,
} from "./helpers";

// Schema definitions following standard patterns
const CreateSchema = getFormDataSchema({
  name: z.string().min(1),
});

const UpdateSchema = getFormDataSchema({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  banner: textEditorContentValidator().optional(),
  enabled: z.boolean().optional(),
  autoAcceptMembers: z.boolean().optional(),
  joiningReasonText: z.string().optional(),
  featuredImage: z
    .object({
      storageType: z.enum(["media", "custom"]),
      data: z.object({
        url: z.string().optional(),
        mediaId: z.string().optional(),
        originalFileName: z.string().optional(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
        access: z.string().optional(),
        thumbnail: z.string().optional(),
        caption: z.string().optional(),
        file: z.string().optional(),
      }),
    })
    .optional()
    .nullable(),
}).extend({
  communityId: z.string().min(1, "Community ID is required"),
});

async function getMembersCount({
  domainId,
  communityId,
  status,
}: {
  domainId: string | mongoose.Types.ObjectId;
  communityId: string;
  status?: CommunityMemberStatus;
}): Promise<number> {
  const query: RootFilterQuery<typeof MembershipModel> = {
    domain: domainId,
    entityId: communityId,
    entityType: Constants.MembershipEntityType.COMMUNITY,
  };

  if (status) {
    query.status = status;
  }

  const count = await MembershipModel.countDocuments(query);

  return count;
}

async function formatCommunity(
  community: InternalCommunity,
  ctx: MainContextType,
): Promise<Community & Pick<InternalCommunity, "autoAcceptMembers">> {
  return {
    name: community.name,
    communityId: community.communityId,
    banner: community.banner,
    enabled: community.enabled,
    categories: community.categories,
    autoAcceptMembers: community.autoAcceptMembers,
    description: community.description,
    pageId: community.pageId,
    products: community.products,
    joiningReasonText: community.joiningReasonText,
    paymentPlans: await getPlans({
      planIds: community.paymentPlans,
      domainId: ctx.domainData.domainObj._id,
    }),
    defaultPaymentPlan: community.defaultPaymentPlan,
    featuredImage: community.featuredImage,
    membersCount: await getMembersCount({
      domainId: ctx.domainData.domainObj._id,
      communityId: community.communityId,
      status: Constants.MembershipStatus.ACTIVE,
    }),
  };
}

type CommunityReportPartial = Omit<CommunityReport, "user"> & {
  userId: string;
};
async function getCommunityReportContent({
  domain,
  communityId,
  type,
  contentId,
  contentParentId,
}: {
  domain: mongoose.Types.ObjectId;
  communityId: string;
  type: CommunityReportType;
  contentId: string;
  contentParentId?: string;
}): Promise<{
  content: string;
  id: string;
  media: CommunityMedia[];
}> {
  let content: any = undefined;

  if (type === Constants.CommunityReportType.POST) {
    content = await CommunityPostModel.findOne({
      domain,
      communityId,
      postId: contentId,
    });
  } else if (type === Constants.CommunityReportType.COMMENT) {
    content = await CommunityCommentModel.findOne({
      domain,
      communityId,
      commentId: contentId,
    });
  } else if (type === Constants.CommunityReportType.REPLY) {
    const comment = await CommunityCommentModel.findOne({
      domain,
      communityId,
      commentId: contentParentId,
    });

    if (!comment) {
      throw new Error(responses.item_not_found);
    }

    content = comment.replies.find((r) => r.replyId === contentId);
  }

  if (!content) {
    throw new Error(responses.item_not_found);
  }

  return {
    content: content.content,
    id: contentId,
    media: content.media,
  };
}
async function formatCommunityReport(
  report: InternalCommunityReport,
  domainId: mongoose.Types.ObjectId,
): Promise<CommunityReportPartial> {
  const content = await getCommunityReportContent({
    domain: domainId,
    communityId: report.communityId,
    type: report.type,
    contentId: report.contentId,
    contentParentId: report.contentParentId,
  });

  return {
    reportId: report.reportId,
    userId: report.userId,
    communityId: report.communityId,
    content,
    type: report.type,
    reason: report.reason,
    status: report.status,
    rejectionReason: report.rejectionReason,
  };
}

const hasActiveSubscription = async (
  member: Membership,
  ctx: MainContextType,
) => {
  if (!member.subscriptionId || !member.subscriptionMethod) {
    return false;
  }

  const paymentMethod = await getPaymentMethodFromSettings(
    ctx.domainData.domainObj.settings,
    member.subscriptionMethod,
  );
  if (!paymentMethod) {
    throw new ConflictException("Payment method not found");
  }
  const isSubscriptionActive = await paymentMethod.validateSubscription(
    member.subscriptionId,
  );
  return isSubscriptionActive;
};

export const communityRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof CommunityModel> = {
        domain: ctx.domainData.domainObj._id,
        deleted: false,
      };
      if (
        !ctx.user ||
        (ctx.user &&
          !checkPermission(ctx.user.permissions, [
            UIConstants.permissions.manageCommunity,
          ]))
      ) {
        query.enabled = true;
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
        CommunityModel.find(query)
          .select({
            _id: 1,
            id: "$_id", // Map _id to id for consistency
            name: 1,
            description: 1,
            pageId: 1,
            enabled: 1,
            membersCount: 1,
            categories: 1,
            featuredImage: 1,
            communityId: 1,
            createdAt: 1,
            updatedAt: 1,
          })
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject),
        paginationMeta.includePaginationCount
          ? CommunityModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return {
        items: await Promise.all(
          items.map(async (community) => ({
            name: community.name,
            communityId: community.communityId,
            banner: community.banner,
            enabled: community.enabled,
            categories: community.categories,
            autoAcceptMembers: community.autoAcceptMembers,
            description: community.description,
            pageId: community.pageId,
            products: community.products,
            joiningReasonText: community.joiningReasonText,
            paymentPlans: await getPlans({
              planIds: community.paymentPlans,
              domainId: ctx.domainData.domainObj._id,
            }),
            defaultPaymentPlan: community.defaultPaymentPlan,
            featuredImage: community.featuredImage,
            membersCount: await getMembersCount({
              domainId: ctx.domainData.domainObj._id,
              communityId: community.communityId,
              status: Constants.MembershipStatus.ACTIVE,
            }),
          })),
        ),
        total,
        meta: paginationMeta,
      };
    }),

  getByCommunityId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = {
        domain: ctx.domainData.domainObj!._id,
        communityId: input.data.communityId,
        deleted: false,
      };
      const community = await CommunityModel.findOne(query);
      if (
        !community ||
        (!community.enabled &&
          (!ctx.user ||
            !checkPermission(ctx.user.permissions, [
              UIConstants.permissions.manageCommunity,
            ])))
      ) {
        return null;
      }

      return await formatCommunity(community, ctx);
    }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCommunity]))
    .input(CreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if community with same name already exists in this domain
      const existingCommunity = await CommunityModel.findOne({
        name: input.data.name,
        deleted: { $ne: true },
        domain: ctx.domainData.domainObj!._id,
      });

      if (existingCommunity) {
        throw new ValidationException(
          "Community with this name already exists",
        );
      }

      const communityId = generateUniqueId();

      const pageId = `${slugify(input.data.name.toLowerCase())}-${communityId.substring(0, 5)}`;

      const community = await CommunityModel.create({
        domain: ctx.domainData.domainObj!._id,
        communityId,
        name: input.data.name,
        pageId,
      });

      await MembershipModel.create({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        status: Constants.MembershipStatus.ACTIVE,
        joiningReason: internal.joining_reason_creator,
        role: Constants.MembershipRole.MODERATE,
      });

      return community;
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(UpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(ctx, input.communityId);
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You do not have permission to update this community",
        );
      }
      const { enabled, ...updateData } = input.data;
      Object.assign(community, updateData);
      const plans = await getPlans({
        planIds: community.paymentPlans,
        domainId: ctx.domainData.domainObj._id,
      });
      if (enabled !== undefined) {
        community.enabled = enabled;

        if (enabled) {
          if (plans.length === 0) {
            throw new ValidationException(responses.payment_plan_required);
          }
          if (!community.defaultPaymentPlan) {
            throw new ValidationException(
              responses.default_payment_plan_required,
            );
          }
        }
      }
      await community.save();
      return await formatCommunity(community, ctx);  
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCommunity]))
    .input(
      z.object({
        communityId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(ctx, input.communityId);

      await CommunityModel.updateOne(
        {
          domain: ctx.domainData.domainObj._id,
          communityId: community.communityId,
        },
        {
          deleted: true,
        },
      );

      return await formatCommunity(community, ctx);
    }),

  addCategory: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
        category: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You do not have permission to add categories to this community",
        );
      }
      if (!community.categories.includes(input.data.category)) {
        community.categories.push(input.data.category);
      }
      await community.save();
      return await formatCommunity(community, ctx);
    }),

  deleteCategory: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
        category: z.string(),
        migrateToCategory: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You do not have permission to delete categories from this community",
        );
      }
      if (community.categories.length === 1) {
        throw new ConflictException(responses.cannot_delete_last_category);
      }
      // if (input.data.migrateToCategory) {
      //   // Logic to migrate posts from the deleted category to the new category
      //   // This is a placeholder and should be replaced with actual migration logic
      //   console.log(`Migrating posts from ${category} to ${migrateToCategory}`); // eslint-disable-line no-console
      // }

      community.categories = community.categories.filter(
        (cat) => cat !== input.data.category,
      );
      await community.save();
      return await formatCommunity(community, ctx);
    }),

  createPaymentPlan: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        name: z.string().min(2).max(100),
        type: z.nativeEnum(Constants.PaymentPlanType),
        oneTimeAmount: z.number().optional(),
        emiAmount: z.number().optional(),
        emiTotalInstallments: z.number().optional(),
        subscriptionMonthlyAmount: z.number().optional(),
        subscriptionYearlyAmount: z.number().optional(),
        entityId: z.string().min(2).max(100),
        entityType: z.nativeEnum(Constants.MembershipEntityType),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        type,
        oneTimeAmount,
        emiAmount,
        emiTotalInstallments,
        subscriptionMonthlyAmount,
        subscriptionYearlyAmount,
        entityType,
        entityId,
        name,
      } = input.data;
      if (type === Constants.PaymentPlanType.ONE_TIME && !oneTimeAmount) {
        throw new Error(
          "One-time amount is required for one-time payment plan",
        );
      }
      if (
        type === Constants.PaymentPlanType.EMI &&
        (!emiAmount || !emiTotalInstallments)
      ) {
        throw new Error(
          "EMI amounts and total installments are required for EMI payment plan",
        );
      }
      if (
        type === Constants.PaymentPlanType.SUBSCRIPTION &&
        ((!subscriptionMonthlyAmount && !subscriptionYearlyAmount) ||
          (subscriptionMonthlyAmount && subscriptionYearlyAmount))
      ) {
        throw new Error(
          "Either monthly or yearly amount is required for subscription payment plan, but not both",
        );
      }
      const entity = await fetchEntity(
        entityType,
        entityId,
        ctx.domainData.domainObj._id.toString(),
      );
      if (!entity) {
        throw new NotFoundException("Entity not found");
      }

      checkEntityPermission(entityType, ctx.user.permissions);

      const existingPlansForEntity = await PaymentPlanModel.find({
        domain: ctx.domainData.domainObj._id,
        planId: { $in: entity.paymentPlans },
        archived: false,
      });

      for (const plan of existingPlansForEntity) {
        if (plan.type === type) {
          if (plan.type !== Constants.PaymentPlanType.SUBSCRIPTION) {
            throw new Error(responses.duplicate_payment_plan);
          }
          if (subscriptionMonthlyAmount && plan.subscriptionMonthlyAmount) {
            throw new Error(responses.duplicate_payment_plan);
          }
          if (subscriptionYearlyAmount && plan.subscriptionYearlyAmount) {
            throw new Error(responses.duplicate_payment_plan);
          }
        }
      }

      const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
      if (!domain) {
        throw new ConflictException("Domain not found");
      }
      const paymentMethod = await getPaymentMethodFromSettings(domain.settings);
      if (!paymentMethod && type !== Constants.PaymentPlanType.FREE) {
        throw new ConflictException(responses.payment_info_required);
      }

      const paymentPlan = await PaymentPlanModel.create({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        name,
        type,
        oneTimeAmount,
        emiAmount,
        emiTotalInstallments,
        subscriptionMonthlyAmount,
        subscriptionYearlyAmount,
      });

      if (entity.paymentPlans.length === 0) {
        entity.defaultPaymentPlan = paymentPlan.planId;
      }

      entity.paymentPlans.push(paymentPlan.planId);
      await entity.save();

      return paymentPlan;
    }),

  archivePaymentPlan: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        planId: z.string().min(1, "Plan ID is required"),
        entityId: z.string().min(1, "Entity ID is required"),
        entityType: z.nativeEnum(Constants.MembershipEntityType),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { planId, entityId, entityType } = input.data;
      const entity = await fetchEntity(
        entityType,
        entityId,
        ctx.domainData.domainObj._id.toString(),
      );
      if (!entity) {
        throw new NotFoundException("Entity not found");
      }

      checkEntityPermission(entityType, ctx.user.permissions);

      const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.domainData.domainObj._id,
        planId,
      });
      if (!paymentPlan) {
        throw new NotFoundException("Payment plan not found");
      }

      if (entity.defaultPaymentPlan === paymentPlan.planId) {
        throw new ConflictException(
          responses.default_payment_plan_cannot_be_archived,
        );
      }

      paymentPlan.archived = true;
      await paymentPlan.save();

      return paymentPlan;
    }),

  changeDefaultPaymentPlan: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        planId: z.string().min(1, "Plan ID is required"),
        entityId: z.string().min(1, "Entity ID is required"),
        entityType: z.nativeEnum(Constants.MembershipEntityType),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domainId = ctx.domainData?.domainObj?._id?.toString();
      if (!domainId) {
        throw new NotFoundException("Domain not found");
      }

      // Fetch entity and check permissions
      const entity = await fetchEntity(
        input.data.entityType,
        input.data.entityId,
        domainId,
      );
      if (!entity) {
        throw new NotFoundException("Entity not found");
      }

      checkEntityPermission(input.data.entityType, ctx.user.permissions);

      const paymentPlan = await PaymentPlanModel.findOne({
        domain: domainId,
        planId: input.data.planId,
        archived: false,
      });

      if (!paymentPlan) {
        throw new NotFoundException("Payment plan not found");
      }
      entity.defaultPaymentPlan = paymentPlan.planId;
      await entity.save();

      return paymentPlan;
    }),

  reportCommunityContent: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        data: z.object({
          communityId: z.string().min(1, "Community ID is required"),
          contentId: z.string().min(1, "Content ID is required"),
          reason: z.string().min(1, "Reason is required"),
          type: z.enum([
            Constants.CommunityReportType.POST,
            Constants.CommunityReportType.COMMENT,
            Constants.CommunityReportType.REPLY,
          ]),
          contentParentId: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, community.communityId);
      if (!member) {
        throw new AuthorizationException(
          "You do not have permission to report content in this community",
        );
      }
      const communityId = community.communityId;
      const domainId = ctx.domainData.domainObj._id;
      const type = input.data.type;
      const contentId = input.data.contentId;
      const existingReport = await CommunityReportModel.findOne({
        domain: domainId,
        userId: ctx.user.userId,
        communityId: communityId,
        contentId: contentId,
      });
      if (existingReport) {
        throw new ValidationException(
          responses.community_content_already_reported,
        );
      }
      let content: any = undefined;
      if (type === Constants.CommunityReportType.POST) {
        content = await CommunityPostModel.findOne({
          domain: domainId,
          communityId,
          postId: contentId,
          deleted: false,
        });
      } else if (type === Constants.CommunityReportType.COMMENT) {
        content = await CommunityCommentModel.findOne({
          domain: domainId,
          communityId,
          commentId: contentId,
          deleted: false,
        });
      } else if (type === Constants.CommunityReportType.REPLY) {
        const comment = await CommunityCommentModel.findOne({
          domain: domainId,
          communityId,
          commentId: input.data.contentParentId,
          deleted: false,
        });

        if (!comment) {
          throw new Error(responses.item_not_found);
        }

        content = comment.replies.find((r) => r.replyId === contentId);
      }

      if (!content) {
        throw new Error(responses.item_not_found);
      }

      if (content.userId === ctx.user.userId) {
        throw new Error(responses.action_not_allowed);
      }

      const report = await CommunityReportModel.create({
        domain: domainId,
        userId: ctx.user.userId,
        communityId,
        contentId,
        type: type.toLowerCase(),
        reason: input.data.reason,
        contentParentId: input.data.contentParentId,
      });

      return formatCommunityReport(report, domainId);
    }),
  join: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string().min(1, "Community ID is required"),
        joiningReason: z.string().min(1, "Joining reason is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      if (!ctx.user.name) {
        throw new ConflictException(responses.profile_incomplete);
      }
      if (community.paymentPlans.length === 0) {
        throw new ConflictException(responses.community_has_no_payment_plans);
      }
      const freePaymentPlanOfCommunity = await PaymentPlanModel.findOne({
        planId: { $in: community.paymentPlans },
        type: Constants.PaymentPlanType.FREE,
        archived: false,
      });
      if (!freePaymentPlanOfCommunity) {
        throw new ConflictException(responses.community_requires_payment);
      }

      let member = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        paymentPlanId: freePaymentPlanOfCommunity.planId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        entityId: community.communityId,
      });
      if (!member) {
        member = await MembershipModel.create({
          domain: ctx.domainData.domainObj._id,
          userId: ctx.user.userId,
          paymentPlanId: freePaymentPlanOfCommunity.planId,
          entityId: community.communityId,
          entityType: Constants.MembershipEntityType.COMMUNITY,
          status: community.autoAcceptMembers
            ? Constants.MembershipStatus.ACTIVE
            : Constants.MembershipStatus.PENDING,
          role: community.autoAcceptMembers
            ? Constants.MembershipRole.POST
            : Constants.MembershipRole.COMMENT,
          joiningReason: input.data.joiningReason,
        });

        // const communityManagers: User[] = await UserModel.find(
        //     {
        //         domain: ctx.domainData.domainObj._id,
        //         permissions: permissions.manageCommunity,
        //         userId: { $nin: [ctx.user.userId] },
        //     },
        //     {
        //         _id: 0,
        //         userId: 1,
        //     },
        // ).lean();
        const communityManagers = await MembershipModel.find({
          domain: ctx.domainData.domainObj._id,
          entityId: community.communityId,
          entityType: Constants.MembershipEntityType.COMMUNITY,
          role: Constants.MembershipRole.MODERATE,
        });

        addNotification({
          domain: ctx.domainData.domainObj._id.toString(),
          entityId: community.communityId,
          entityAction:
            Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_REQUESTED,
          forUserIds: communityManagers.map((m) => m.userId),
          userId: ctx.user.userId,
        });
      }

      return member;
    }),

  leave: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string().min(1, "Community ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, community.communityId);
      if (!member) {
        return true;
      }
      if (member.role === Constants.MembershipRole.MODERATE) {
        const otherModeratorsCount = await MembershipModel.countDocuments({
          domain: ctx.domainData.domainObj._id,
          entityId: community.communityId,
          entityType: Constants.MembershipEntityType.COMMUNITY,
          status: Constants.MembershipStatus.ACTIVE,
          userId: { $ne: ctx.user.userId },
          role: Constants.MembershipRole.MODERATE,
        });

        // const otherMembersWithManageCommunityPermission =
        //     await UserModel.countDocuments({
        //         domain: ctx.domainData.domainObj._id,
        //         userId: { $in: otherMembers.map((m) => m.userId) },
        //         permissions: permissions.manageCommunity,
        //     });

        if (otherModeratorsCount === 0) {
          throw new ConflictException(
            responses.cannot_leave_community_last_moderator,
          );
        }
      }
      if (member.subscriptionId) {
        // Get fresh domain settings to ensure we have latest payment configuration
        const domain = await DomainModel.findById(ctx.domainData.domainObj._id);
        if (!domain) {
          throw new ConflictException("Domain not found");
        }
        const paymentMethod = await getPaymentMethodFromSettings(
          domain.settings,
          member.subscriptionMethod,
        );
        await paymentMethod?.cancel(member.subscriptionId);
      }
      await member.deleteOne();
      return true;
    }),
  getCommunityMembership: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string().min(1, "Community ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      // const member = await getMembership(ctx, community.communityId); add filtet to use active
      return await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        userId: ctx.user.userId,
      });
    }),

  getMembers: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          communityId: z.string().min(1, "Community ID is required"),
          status: z.nativeEnum(Constants.MembershipStatus).optional(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const community = await CommunityModel.findOne(
        getCommunityQuery(ctx as any, input.filter.communityId),
      );
      if (!community) {
        throw new NotFoundException("Community not found");
      }
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException();
      }
      const query: RootFilterQuery<typeof MembershipModel> = {
        domain: ctx.domainData.domainObj._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
      };
      if (input.filter.status) {
        query.status = input.filter.status;
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
          .populate<{
            user: {
              userId: User["userId"];
              name: User["name"];
              email: User["email"];
              avatar: User["avatar"];
            };
          }>({
            path: "user",
            select: {
              userId: 1,
              name: 1,
              email: 1,
              avatar: 1,
            },
          })
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? MembershipModel.countDocuments(query)
          : Promise.resolve(null),
      ]);
      return {
        items: items.map((member) => ({
          userId: member.userId,
          status: member.status,
          role: member.role,
          joiningReason: member.joiningReason,
          rejectionReason: member.rejectionReason,
          subscriptionMethod: member.subscriptionMethod,
          subscriptionId: member.subscriptionId,
          user: {
            userId: member.user.userId,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
          },
        })),
        total,
        meta: paginationMeta,
      };
    }),

  updateMemberStatus: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string().min(1, "Community ID is required"),
        userId: z.string().min(1, "User ID is required"),
        rejectionReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userId === input.data.userId) {
        throw new AuthorizationException()
      }
      const community = await CommunityModel.findOne(getCommunityQuery(ctx, input.data.communityId));
      if (!community) {
        throw new NotFoundException("Community", input.data.communityId);
      }
      const memberUser = await UserModel.findOne({
        domain: ctx.domainData.domainObj._id,
        userId: input.data.userId,
      });
      if (!memberUser) {
        throw new NotFoundException("User", input.data.userId);
      }
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new NotFoundException("Member", input.data.userId);
      }
      const targetMember = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        userId: input.data.userId,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
      });
      if (!targetMember) {
        throw new NotFoundException("Member", input.data.userId);
      }
      const otherActiveModeratorsCount = await MembershipModel.countDocuments({
        domain: ctx.domainData.domainObj._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        role: Constants.MembershipRole.MODERATE,
        status: Constants.MembershipStatus.ACTIVE,
        userId: { $ne: input.data.userId },
      });
      if (otherActiveModeratorsCount === 0) {
        throw new AuthorizationException();
      }
      const nextStatus = getNextStatusForCommunityMember(
        targetMember.status as CommunityMemberStatus,
      );
      if (nextStatus === Constants.MembershipStatus.REJECTED) {
        if (!input.data.rejectionReason) {
          throw new ConflictException(responses.rejection_reason_missing);
        }
        if (await hasActiveSubscription(targetMember, ctx as any)) {
          throw new ConflictException(
            responses.cannot_reject_member_with_active_subscription,
          );
        }
        targetMember.rejectionReason = input.data.rejectionReason;
      }

      targetMember.status = nextStatus!;

      if (targetMember.status === Constants.MembershipStatus.ACTIVE) {
        targetMember.rejectionReason = undefined;

        await addNotification({
          domain: ctx.domainData.domainObj._id.toString(),
          entityId: community.communityId,
          entityAction:
            Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_GRANTED,
          forUserIds: [input.data.userId],
          userId: ctx.user.userId,
        });
      }

      await targetMember.save();

      return {
        ...targetMember.toObject(),
        user: {
          userId: memberUser.userId,
          name: memberUser.name,
          email: memberUser.email,
          avatar: memberUser.avatar,
        },
      };
    }),

  updateMemberRole: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string().min(1, "Community ID is required"),
        userId: z.string().min(1, "User ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userId === input.data.userId) {
        throw new AuthorizationException();
      }

      const community = await CommunityModel.findOne(
        getCommunityQuery(ctx as any, input.data.communityId),
      );

      if (!community) {
        throw new NotFoundException("Community not found");
      }

      const memberUser = await UserModel.findOne({
        domain: ctx.domainData.domainObj._id,
        userId: input.data.userId,
      });
      if (!memberUser) {
        throw new NotFoundException("User not found");
      }

      // const member = await MembershipModel.findOne<Membership>({
      //     domain: ctx.subdomain._id,
      //     userId,
      //     entityId: communityId,
      //     entityType: Constants.MembershipEntityType.COMMUNITY,
      // });
      const member = await getMembership(ctx, community.communityId);

      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new Error(responses.item_not_found);
      }

      const targetMember = await MembershipModel.findOne({
        domain: ctx.domainData.domainObj._id,
        userId: input.data.userId,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
      });

      if (!targetMember) {
        throw new NotFoundException("Member not found");
      }

      if (targetMember.status !== Constants.MembershipStatus.ACTIVE) {
        throw new ConflictException(
          responses.cannot_change_role_inactive_member,
        );
      }

      const otherActiveModeratorsCount = await MembershipModel.countDocuments({
        domain: ctx.domainData.domainObj._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        role: Constants.MembershipRole.MODERATE,
        status: Constants.MembershipStatus.ACTIVE,
        userId: { $ne: input.data.userId },
      });

      if (otherActiveModeratorsCount === 0) {
        throw new AuthorizationException();
      }

      const nextRole = getNextRoleForCommunityMember(targetMember.role);

      targetMember.role = nextRole!;

      await targetMember.save();
      return {
        ...targetMember.toObject(),
        user: {
          userId: memberUser.userId,
          name: memberUser.name,
          email: memberUser.email,
          avatar: memberUser.avatar,
        },
      };
    }),
});
