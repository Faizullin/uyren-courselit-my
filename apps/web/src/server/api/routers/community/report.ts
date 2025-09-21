import { responses } from "@/config/strings";
import {
  getNextStatusForCommunityReport,
  hasCommunityPermission,
} from "@/lib/ui/lib/utils";
import CommunityCommentModel, {
  InternalCommunityComment,
} from "@/models/community/CommunityComment";
import CommunityPostModel from "@/models/community/CommunityPost";
import CommunityPostSubscriberModel, {
  CommunityPostSubscriber,
} from "@/models/community/CommunityPostSubscriber";
import CommunityReportModel, {
  InternalCommunityReport,
} from "@/models/community/CommunityReport";
import { InternalUser } from "@workspace/common-logic";
import {
  CommunityMedia,
  CommunityReport,
  CommunityReportType,
  Constants,
  Membership,
} from "@workspace/common-models";
import mongoose from "mongoose";
import { z } from "zod";
import {
  AuthorizationException,
  NotFoundException,
} from "../../core/exceptions";
import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "../../core/procedures";
import { getFormDataSchema, ListInputSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { paginate } from "../../core/utils";
import {
  getCommunityObjOrAssert,
  getMembership,
  toggleContentVisibility,
} from "./helpers";

const CreateSchema = getFormDataSchema({
  title: z.string().min(1),
  content: z.string().optional(),
  communityId: z.string(),
  category: z.string(),
});

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

type PostUserType = Pick<InternalUser, "userId" | "name" | "avatar" | "email">;
type CommunityReportPartial = Omit<CommunityReport, "user"> & {
  userId: string;
};
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

async function getPostSubscribersExceptUserId({
  domain,
  userId,
  postId,
}: {
  domain: mongoose.Types.ObjectId;
  userId: string;
  postId: string;
}): Promise<CommunityPostSubscriber[]> {
  return await CommunityPostSubscriberModel.find({
    domain,
    postId,
    userId: { $nin: [userId] },
  });
}

function hasPermissionToDelete(
  membership: Membership,
  comment: InternalCommunityComment,
  replyId?: string,
) {
  const ownerUserId = replyId
    ? comment.replies.find((r) => r.replyId === replyId)?.userId
    : comment.userId;
  return (
    membership.userId === ownerUserId ||
    hasCommunityPermission(membership, Constants.MembershipRole.MODERATE)
  );
}

export const reportRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          communityId: z.string(),
          status: z
            .enum([
              Constants.CommunityReportStatus.ACCEPTED,
              Constants.CommunityReportStatus.REJECTED,
              Constants.CommunityReportStatus.PENDING,
            ])
            .optional(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.filter.communityId,
      );
      const member = await getMembership(ctx, communityObj.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }
      const query = {
        domain: ctx.domainData.domainObj._id,
        deleted: false,
        communityId: communityObj.communityId,
        ...(input.filter.status ? { status: input.filter.status } : {}),
      };
      const meta = paginate(input.pagination);
      const [items, total] = await Promise.all([
        CommunityReportModel.find(query)
          .skip(meta.skip)
          .limit(meta.take)
          .populate<{
            user: PostUserType;
          }>({
            path: "userId",
            select: "userId name avatar email",
          })
          .exec(),
        meta.includePaginationCount
          ? CommunityPostModel.countDocuments(query)
          : Promise.resolve(null),
      ]);
      return {
        items: await Promise.all(
          items.map((item) =>
            formatCommunityReport(item, ctx.domainData.domainObj._id),
          ),
        ),
        total,
        meta,
      };
    }),

  updateStatus: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
        reportId: z.string(),
        rejectionReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, communityObj.communityId);
      if (
        !member ||
        !hasCommunityPermission(member!, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }
      const report =
        await CommunityReportModel.findOne<InternalCommunityReport>({
          domain: ctx.domainData.domainObj._id,
          communityId: communityObj.communityId,
          reportId: input.data.reportId,
        });

      if (!report) {
        throw new Error(responses.item_not_found);
      }

      const nextStatus = getNextStatusForCommunityReport(report.status);
      if (nextStatus === Constants.CommunityReportStatus.REJECTED) {
        if (!input.data.rejectionReason) {
          throw new NotFoundException("Rejection reason is required");
        }
        report.rejectionReason = input.data.rejectionReason;
      } else {
        report.rejectionReason = "";
      }

      report.status = nextStatus!;

      await (report as any).save();

      if (report.status === Constants.CommunityReportStatus.ACCEPTED) {
        toggleContentVisibility(report.contentId, report.type, true);
      } else {
        toggleContentVisibility(report.contentId, report.type, false);
      }

      return await formatCommunityReport(report, ctx.domainData.domainObj._id);
    }),
});
