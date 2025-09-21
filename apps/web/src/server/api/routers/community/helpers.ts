import CommunityModel from "@/models/community/Community";
import CommunityCommentModel from "@/models/community/CommunityComment";
import CommunityPostModel from "@/models/community/CommunityPost";
import CommunityPostSubscriberModel from "@/models/community/CommunityPostSubscriber";
import CourseModel from "@/models/Course";
import MembershipModel from "@/models/Membership";
import PaymentPlanModel, { InternalPaymentPlan } from "@/models/PaymentPlan";
import { TRPCError } from "@trpc/server";

import {
  Constants,
  MembershipEntityType,
  PaymentPlanType,
  UIConstants,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import {
  AuthorizationException,
  NotFoundException,
} from "../../core/exceptions";
import { MainContextType } from "../../core/procedures";

const { MembershipEntityType: membershipEntityType } = Constants;

const { permissions } = UIConstants;

export async function fetchEntity(
  entityType: MembershipEntityType,
  entityId: string,
  domainId: string,
) {
  if (entityType === membershipEntityType.COURSE) {
    return await CourseModel.findOne({
      domain: domainId,
      courseId: entityId,
    });
  } else if (entityType === membershipEntityType.COMMUNITY) {
    return await CommunityModel.findOne({
      domain: domainId,
      communityId: entityId,
      deleted: false,
    });
  }
  return null;
}

export function checkEntityPermission(
  entityType: MembershipEntityType,
  userPermissions: string[],
) {
  if (entityType === membershipEntityType.COURSE) {
    if (!checkPermission(userPermissions, [permissions.manageCourse])) {
      throw new AuthorizationException("Not authorized to manage courses");
    }
  } else if (entityType === membershipEntityType.COMMUNITY) {
    if (!checkPermission(userPermissions, [permissions.manageCommunity])) {
      throw new AuthorizationException("Not authorized to manage communities");
    }
  }
}

export async function getPlans({
  planIds,
  domainId,
}: {
  planIds: string[];
  domainId: mongoose.Types.ObjectId | string;
}) {
  return PaymentPlanModel.find({
    domain: domainId,
    planId: { $in: planIds },
    archived: false,
    internal: false,
  });
}

export async function validatePaymentPlanInputs(
  type: PaymentPlanType,
  oneTimeAmount?: number,
  emiAmount?: number,
  emiTotalInstallments?: number,
  subscriptionMonthlyAmount?: number,
  subscriptionYearlyAmount?: number,
) {
  if (type === Constants.PaymentPlanType.ONE_TIME && !oneTimeAmount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One-time amount is required for one-time payment plan",
    });
  }

  if (
    type === Constants.PaymentPlanType.EMI &&
    (!emiAmount || !emiTotalInstallments)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "EMI amounts and total installments are required for EMI payment plan",
    });
  }

  if (
    type === Constants.PaymentPlanType.SUBSCRIPTION &&
    ((!subscriptionMonthlyAmount && !subscriptionYearlyAmount) ||
      (subscriptionMonthlyAmount && subscriptionYearlyAmount))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Either monthly or yearly amount is required for subscription payment plan, but not both",
    });
  }
}

export async function checkDuplicatePaymentPlans(
  entity: any,
  type: PaymentPlanType,
  domainId: string,
  subscriptionMonthlyAmount?: number,
  subscriptionYearlyAmount?: number,
) {
  const existingPlansForEntity = await PaymentPlanModel.find({
    domain: domainId,
    planId: { $in: entity.paymentPlans },
    archived: false,
  });

  for (const plan of existingPlansForEntity) {
    if (plan.type === type) {
      if (plan.type !== Constants.PaymentPlanType.SUBSCRIPTION) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Duplicate payment plan type already exists",
        });
      }
      if (subscriptionMonthlyAmount && plan.subscriptionMonthlyAmount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Monthly subscription plan already exists",
        });
      }
      if (subscriptionYearlyAmount && plan.subscriptionYearlyAmount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Yearly subscription plan already exists",
        });
      }
    }
  }
}

export async function getInternalPaymentPlan(domainId: string) {
  return await PaymentPlanModel.findOne({
    domain: domainId,
    internal: true,
  });
}

export async function createInternalPaymentPlan(
  domainId: string,
  userId: string,
) {
  return await PaymentPlanModel.create({
    domain: domainId,
    name: "Internal Payment Plan",
    type: Constants.PaymentPlanType.FREE,
    internal: true,
    userId: userId,
  });
}

export async function addPostSubscription({
  domain,
  userId,
  postId,
}: {
  domain: mongoose.Types.ObjectId;
  userId: string;
  postId: string;
}) {
  const existingSubscription = await CommunityPostSubscriberModel.findOne({
    domain,
    userId,
    postId,
  });

  if (!existingSubscription) {
    await CommunityPostSubscriberModel.create({
      domain,
      userId,
      postId,
    });
  }
}

export const getCommunityObjOrAssert = async (
  ctx: any,
  communityId: string,
) => {
  const query: RootFilterQuery<typeof CommunityModel> = {
    domain: ctx.domainData.domainObj._id,
    communityId,
    deleted: false,
  };
  if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    query.enabled = true;
  }
  const community = await CommunityModel.findOne(query);
  if (!community) {
    throw new NotFoundException("Community", communityId);
  }
  return community;
};
export async function getMembership(
  ctx: any,
  communityId: mongoose.Types.ObjectId | string,
) {
  return await MembershipModel.findOne({
    domain: ctx.domainData.domainObj._id,
    entityId: communityId,
    entityType: Constants.MembershipEntityType.COMMUNITY,
    userId: ctx.user.userId,
    status: Constants.MembershipStatus.ACTIVE,
  });
}

export async function toggleContentVisibility(
  contentId: string,
  type: string,
  visible: boolean,
) {
  if (type === Constants.CommunityReportType.POST) {
    await CommunityPostModel.updateOne(
      { postId: contentId },
      { $set: { deleted: visible } },
    );
  } else if (type === Constants.CommunityReportType.COMMENT) {
    await CommunityCommentModel.updateOne(
      { commentId: contentId },
      { $set: { deleted: visible } },
    );
  } else if (type === Constants.CommunityReportType.REPLY) {
    await CommunityCommentModel.updateOne(
      { "replies.replyId": contentId },
      { $set: { "replies.$.deleted": visible } },
    );
  } else {
    throw new Error("Invalid content type");
  }
}

export function getCommunityQuery(ctx: MainContextType, communityId: string) {
  const query: RootFilterQuery<typeof CommunityModel> = {
    domain: ctx.domainData.domainObj._id,
    communityId,
    deleted: false,
  };
  if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    query.enabled = true;
  }
  return query;
}
