import CommunityModel from "@/models/community/Community";
import CommunityCommentModel from "@/models/community/CommunityComment";
import CommunityPostModel from "@/models/community/CommunityPost";
import NotificationModel from "@/models/Notification";
import UserModel from "@/models/User";
import { TRPCError } from "@trpc/server";
import {
  Constants,
  Notification,
  NotificationEntityAction,
} from "@workspace/common-models";
import { z } from "zod";
import { NotFoundException } from "../../core/exceptions";
import { assertDomainExist } from "../../core/permissions";
import { protectedProcedure } from "../../core/procedures";
import { ListInputSchema } from "../../core/schema";
import { router } from "../../core/trpc";

// Helper function to get user name by userId
async function getUserName(userId: string): Promise<string> {
  try {
    const user = await UserModel.findOne({ userId }).select("name email");
    return user?.name || user?.email || "Someone";
  } catch {
    return "Someone";
  }
}

// Helper function to truncate text
function truncate(text: string, length: number): string {
  if (!text) return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
}

// Helper function to generate notification messages based on entity action
async function getMessage({
  entityAction,
  entityId,
  userName,
  loggedInUserId,
  entityTargetId,
}: {
  entityAction: NotificationEntityAction;
  entityId: string;
  entityTargetId?: string;
  userName: string;
  loggedInUserId: string;
}): Promise<{ message: string; href: string }> {
  switch (entityAction) {
    case Constants.NotificationEntityAction.COMMUNITY_POSTED:
      const post = await CommunityPostModel.findOne({ postId: entityId });
      if (!post) return { message: "", href: "" };

      const community = await CommunityModel.findOne({
        communityId: post.communityId,
      });
      if (!community) return { message: "", href: "" };

      return {
        message: `${userName} created a post '${truncate(post.title, 20).trim()}' in ${community.name}`,
        href: `/dashboard/community/${community.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_COMMENTED:
      const post1 = await CommunityPostModel.findOne({ postId: entityId });
      if (!post1) return { message: "", href: "" };

      const community1 = await CommunityModel.findOne({
        communityId: post1.communityId,
      });
      if (!community1) return { message: "", href: "" };

      return {
        message: `${userName} commented on ${loggedInUserId === post1.userId ? "your" : ""} post '${truncate(post1.title, 20).trim()}' in ${community1.name}`,
        href: `/dashboard/community/${community1.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_REPLIED:
      const comment = await CommunityCommentModel.findOne({
        commentId: entityTargetId,
      });
      if (!comment) return { message: "", href: "" };

      const reply = comment.replies.find((r: any) => r.replyId === entityId);
      if (!reply) return { message: "", href: "" };

      let parentReply;
      if (reply.parentReplyId) {
        parentReply = comment.replies.find(
          (r: any) => r.replyId === reply.parentReplyId,
        );
      }

      const [post2, community2] = await Promise.all([
        CommunityPostModel.findOne({ postId: comment.postId }),
        CommunityModel.findOne({ communityId: comment.communityId }),
      ]);

      if (!post2 || !community2) return { message: "", href: "" };

      const prefix = parentReply
        ? loggedInUserId === parentReply.userId
          ? "your"
          : "a"
        : loggedInUserId === comment.userId
          ? "your"
          : "a";

      return {
        message: `${userName} replied to ${prefix} comment on '${truncate(post2.title, 20).trim()}' in ${community2.name}`,
        href: `/dashboard/community/${community2.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_POST_LIKED:
      const post3 = await CommunityPostModel.findOne({ postId: entityId });
      if (!post3) return { message: "", href: "" };

      const community3 = await CommunityModel.findOne({
        communityId: post3.communityId,
      });
      if (!community3) return { message: "", href: "" };

      return {
        message: `${userName} liked your post '${truncate(post3.title, 20).trim()}' in ${community3.name}`,
        href: `/dashboard/community/${community3.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_COMMENT_LIKED:
      const comment1 = await CommunityCommentModel.findOne({
        commentId: entityId,
      });
      if (!comment1) return { message: "", href: "" };

      const [post4, community4] = await Promise.all([
        CommunityPostModel.findOne({ postId: comment1.postId }),
        CommunityModel.findOne({ communityId: comment1.communityId }),
      ]);

      if (!post4 || !community4) return { message: "", href: "" };

      return {
        message: `${userName} liked your comment '${truncate(comment1.content, 20).trim()}' on '${truncate(post4.title, 20).trim()}' in ${community4.name}`,
        href: `/dashboard/community/${community4.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_REPLY_LIKED:
      const comment2 = await CommunityCommentModel.findOne({
        commentId: entityTargetId,
      });
      if (!comment2) return { message: "", href: "" };

      const reply1 = comment2.replies.find((r: any) => r.replyId === entityId);
      if (!reply1) return { message: "", href: "" };

      const [post5, community5] = await Promise.all([
        CommunityPostModel.findOne({ postId: comment2.postId }),
        CommunityModel.findOne({ communityId: comment2.communityId }),
      ]);

      if (!post5 || !community5) return { message: "", href: "" };

      return {
        message: `${userName} liked your reply '${truncate(reply1.content, 20).trim()}' on '${truncate(post5.title, 20).trim()}' in ${community5.name}`,
        href: `/dashboard/community/${community5.communityId}`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_REQUESTED:
      const community6 = await CommunityModel.findOne({
        communityId: entityId,
      });
      if (!community6) return { message: "", href: "" };

      return {
        message: `${userName} requested to join ${community6.name}`,
        href: `/dashboard/community/${community6.communityId}/manage/memberships`,
      };

    case Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_GRANTED:
      const community7 = await CommunityModel.findOne({
        communityId: entityId,
      });
      if (!community7) return { message: "", href: "" };

      return {
        message: `${userName} granted your request to join ${community7.name}`,
        href: `/dashboard/community/${community7.communityId}`,
      };

    default:
      return { message: "", href: "" };
  }
}

// Helper function to format a single notification
async function formatNotification(
  notification: any,
  loggedInUserId: string,
): Promise<Notification> {
  const userName = await getUserName(notification.userId);
  const { message, href } = await getMessage({
    entityAction: notification.entityAction,
    entityId: notification.entityId,
    userName,
    loggedInUserId,
    entityTargetId: notification.entityTargetId,
  });

  return {
    notificationId: notification.notificationId,
    message,
    href,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

// Helper function to format multiple notifications
async function formatNotifications(
  notifications: any[],
  loggedInUserId: string,
): Promise<Notification[]> {
  return Promise.all(
    notifications.map(async (notification) => {
      return await formatNotification(notification, loggedInUserId);
    }),
  );
}

export const notificationRouter = router({
  // Get notifications with pagination (protected)
  protectedGetMyNotifications: protectedProcedure
    .input(
      ListInputSchema.extend({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const domainObj = await assertDomainExist(ctx);
        const userId = ctx.session.user.id;

        // const { skip, take } = paginate(input.pagination);
        const page = input.page || 1;
        const limit = input.limit || 10;

        const query = {
          domain: domainObj._id,
          forUserId: userId,
        };

        const [notifications, total] = await Promise.all([
          NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          NotificationModel.countDocuments(query),
        ]);

        const formattedNotifications = await formatNotifications(
          notifications,
          userId,
        );

        return {
          notifications: formattedNotifications,
          total,
          meta: { skip: (page - 1) * limit, take: limit },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error fetching notifications:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notifications",
        });
      }
    }),

  // Get a single notification by ID (protected)
  protectedGetNotification: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const domainObj = await assertDomainExist(ctx);

        const userId = ctx.session.user.id;

        const notification = await NotificationModel.findOne({
          domain: domainObj._id,
          forUserId: userId,
          notificationId: input.notificationId,
        }).lean();

        if (!notification) {
          throw new NotFoundException("Notification", input.notificationId);
        }

        return await formatNotification(notification, userId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error fetching notification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notification",
        });
      }
    }),

  // Mark a notification as read (protected)
  protectedMarkAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const domainObj = await assertDomainExist(ctx);

        const userId = ctx.session.user.id;

        const notification = await NotificationModel.findOneAndUpdate(
          {
            domain: domainObj._id,
            forUserId: userId,
            notificationId: input.notificationId,
          },
          { read: true },
          { new: true },
        );

        if (!notification) {
          throw new NotFoundException("Notification", input.notificationId);
        }

        return { success: true, message: "Notification marked as read" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error marking notification as read:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
        });
      }
    }),

  // Mark all notifications as read (protected)
  protectedMarkAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const domainObj = await assertDomainExist(ctx);

      const userId = ctx.session.user.id;

      await NotificationModel.updateMany(
        {
          domain: domainObj._id,
          forUserId: userId,
          read: false,
        },
        { read: true },
      );

      return { success: true, message: "All notifications marked as read" };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error marking all notifications as read:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to mark all notifications as read",
      });
    }
  }),

  // Get unread notification count (protected)
  protectedGetUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const domainObj = await assertDomainExist(ctx);

      const userId = ctx.session.user.id;

      const count = await NotificationModel.countDocuments({
        domain: domainObj._id,
        forUserId: userId,
        read: false,
      });

      return { count };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error getting unread notification count:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get unread notification count",
      });
    }
  }),
});
