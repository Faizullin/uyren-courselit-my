import { responses } from "@/config/strings";
import { Log } from "@/lib/logger";
import { hasCommunityPermission } from "@/lib/ui/lib/utils";
import CommunityCommentModel, {
  InternalCommunityComment,
} from "@/models/community/CommunityComment";
import CommunityPostModel, {
  InternalCommunityPost,
} from "@/models/community/CommunityPost";
import CommunityPostSubscriberModel from "@/models/community/CommunityPostSubscriber";
import MembershipModel from "@/models/Membership";
import NotificationModel from "@/models/Notification";
import UserModel from "@/models/User";
import { addNotification } from "@/server/lib/queue";
import { InternalUser } from "@workspace/common-logic";
import { Constants, Membership, User } from "@workspace/common-models";
import { generateUniqueId } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";
import {
  AuthorizationException,
  NotFoundException,
  ValidationException,
} from "../../core/exceptions";
import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "../../core/procedures";
import { getFormDataSchema, ListInputSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { buildMongooseQuery, paginate } from "../../core/utils";
import {
  addPostSubscription,
  getCommunityObjOrAssert,
  getMembership,
} from "./helpers";

const CreateSchema = getFormDataSchema({
  title: z.string().min(1),
  content: z.string().optional(),
  communityId: z.string(),
  category: z.string(),
});

type PostUserType = Pick<InternalUser, "userId" | "name" | "avatar" | "email">;
const formatPost = (
  post: InternalCommunityPost & {
    user?: PostUserType;
  },
  user: User,
) => ({
  communityId: post.communityId,
  postId: post.postId,
  title: post.title,
  content: post.content,
  category: post.category,
  media: post.media,
  pinned: post.pinned,
  commentsCount: post.commentsCount,
  likesCount: post.likes.length,
  updatedAt: post.updatedAt,
  hasLiked: post.likes.includes(user.userId),
  userId: post.userId,
  user: post.user || undefined,
});

const formatComment = (comment: any, user: User) => ({
  communityId: comment.communityId,
  postId: comment.postId,
  userId: comment.userId,
  commentId: comment.commentId,
  content: comment.content,
  hasLiked: comment.likes.includes(user.userId),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  media: comment.media,
  likesCount: comment.likes.length,
  replies: comment.replies.map((reply: any) => ({
    replyId: reply.replyId,
    userId: reply.userId,
    content: reply.content,
    media: reply.media,
    parentReplyId: reply.parentReplyId,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    likesCount: reply.likes.length,
    hasLiked: reply.likes.includes(user.userId),
    deleted: reply.deleted,
    user: reply.user,
  })),
  deleted: comment.deleted,
});

async function getPostSubscribersExceptUserId({
  domain,
  userId,
  postId,
}: {
  domain: mongoose.Types.ObjectId;
  userId: string;
  postId: string;
}) {
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

export const postRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          title: z.string().optional(),
          communityId: z.string(),
          category: z.string().optional(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.filter.communityId,
      );
      const query: RootFilterQuery<typeof CommunityPostModel> = {
        domain: ctx.domainData.domainObj._id,
        deleted: false,
        communityId: communityObj.communityId,
      };
      const member = await getMembership(ctx, communityObj.communityId);
      if (!member) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }
      if (input.filter.category) {
        query.category = input.filter.category;
      }
      const metaData = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };
      const [items, total] = await Promise.all([
        CommunityPostModel.find(query)
          .skip(metaData.skip)
          .limit(metaData.take)
          .sort(sortObject)
          .populate<{
            user: PostUserType;
          }>({
            path: "userId",
            select: "userId name avatar email",
          })
          .exec(),
        metaData.includePaginationCount
          ? CommunityPostModel.countDocuments(query)
          : Promise.resolve(null),
      ]);
      return {
        items: items.map((item) => formatPost(item, ctx.user)),
        total,
        meta: metaData,
      };
    }),

  getByPostIdAndCommunityId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        postId: z.string(),
        communityId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const post = await CommunityPostModel.findOne({
        domain: ctx.domainData.domainObj._id,
        communityId: community.communityId,
        postId: input.data.postId,
        deleted: false,
      });
      if (!post) {
        throw new NotFoundException("Post", String(input.data.postId));
      }
      const member = await getMembership(ctx, community.communityId);
      if (!member) {
        return null;
      }
      return formatPost(post, ctx.user as any);
    }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(CreateSchema)
    .mutation(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const member = await getMembership(ctx, communityObj.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.POST)
      ) {
        throw new Error(responses.action_not_allowed);
      }
      if (!communityObj.categories.includes(input.data.category)) {
        throw new AuthorizationException(responses.invalid_category);
      }

      const post = await CommunityPostModel.create({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        communityId: communityObj.communityId,
        title: input.data.title,
        content: input.data.content || "",
        category: input.data.category,
        // media,
      });

      await addPostSubscription({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        postId: post.postId,
      });

      try {
        const members = await MembershipModel.find<Membership>({
          domain: ctx.domainData.domainObj._id,
          entityId: communityObj.communityId,
          entityType: Constants.MembershipEntityType.COMMUNITY,
          status: Constants.MembershipStatus.ACTIVE,
        }).lean();

        await addNotification({
          domain: ctx.domainData.domainObj._id.toString(),
          entityId: post.postId,
          entityAction: Constants.NotificationEntityAction.COMMUNITY_POSTED,
          forUserIds: members
            .map((m) => m.userId)
            .filter((id) => id !== ctx.user.userId),
          userId: ctx.user.userId,
        });
      } catch (err) {
        const typedErr = err as Error;
        Log.error(
          `Error sending notifications for community post: ${typedErr.message}`,
          {
            communityId: communityObj.communityId,
            postId: post.postId,
            stack: typedErr.stack as any,
          },
        );
      }

      return formatPost(post, ctx.user as any);
    }),

  // update: teacherProcedure
  //   .input(UpdateSchema)
  //   .mutation(async ({ ctx, input }) => {
  //     const where = await getOrgScopedWhere(ctx, { id: input.id });

  //     const row = await ctx.prisma.post.findFirst({
  //       where,
  //       select: { ownerId: true },
  //     });

  //     if (!row) throw new NotFoundException("Post", String(input.id));
  //     await assertOwnerOrAdmin(ctx, row.ownerId);

  //     if (input.data.slug)
  //       await ensureUniqueSlug(ctx, input.data.slug, input.id);

  //     return ctx.prisma.post.update({
  //       where: { id: input.id },
  //       data: input.data,
  //       include: {
  //         tenant: {
  //           select: {
  //             id: true,
  //             name: true,
  //             organization: { select: { name: true } },
  //           },
  //         },
  //       },
  //     });
  //   }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({ postId: z.string(), communityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.communityId,
      );
      const query: RootFilterQuery<typeof CommunityPostModel> = {
        domain: ctx.domainData.domainObj._id,
        postId: input.postId,
        communityId: communityObj.communityId,
      };
      const member = await getMembership(ctx, communityObj.communityId);
      if (!hasCommunityPermission(member!, Constants.MembershipRole.MODERATE)) {
        query["userId"] = ctx.user.userId;
      }

      const post = await CommunityPostModel.findOne(query);
      if (!post) {
        throw new NotFoundException("Post", String(input.postId));
      }
      post.deleted = true;
      await post.save();
      return post;
    }),

  togglePostLike: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        communityId: z.string(),
        postId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.communityId,
      );
      const post = await CommunityPostModel.findOne({
        postId: input.postId,
        communityId: communityObj.communityId,
        domain: ctx.domainData.domainObj._id,
        deleted: false,
      });
      if (!post) {
        throw new NotFoundException("Post", String(input));
      }
      const member = await getMembership(ctx, post.communityId);
      if (!member) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }
      let liked = false;
      if (post.likes.includes(ctx.user.userId)) {
        post.likes = post.likes.filter((id) => id !== ctx.user.userId);
      } else {
        post.likes.push(ctx.user.userId);
        liked = true;
      }
      await post.save();
      if (liked && post.userId !== ctx.user.userId) {
        const existingNotification = await NotificationModel.findOne({
          domain: ctx.domainData.domainObj._id,
          entityId: post.postId,
          entityAction: Constants.NotificationEntityAction.COMMUNITY_POST_LIKED,
          forUserId: post.userId,
          userId: ctx.user.userId,
        });
        if (!existingNotification) {
          await addNotification({
            domain: ctx.domainData.domainObj._id.toString(),
            entityId: post.postId,
            entityAction:
              Constants.NotificationEntityAction.COMMUNITY_POST_LIKED,
            forUserIds: [post.userId],
            userId: ctx.user.userId,
          });
        }
      }

      return formatPost(post, ctx.user as unknown as InternalUser);
    }),

  togglePinned: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        communityId: z.string(),
        postId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const communityObj = await getCommunityObjOrAssert(
        ctx,
        input.communityId,
      );
      const post = await CommunityPostModel.findOne({
        postId: input.postId,
        communityId: communityObj.communityId,
        domain: ctx.domainData.domainObj._id,
        deleted: false,
      });
      if (!post) {
        throw new NotFoundException("Post", String(input.postId));
      }
      const member = await getMembership(ctx, post.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.MODERATE)
      ) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }
      post.pinned = !post.pinned;
      await post.save();
      return formatPost(post, ctx.user as any);
    }),

  listComments: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          communityId: z.string(),
          postId: z.string(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.filter.communityId,
      );
      const member = await getMembership(ctx, community.communityId);
      if (!member) {
        return {
          items: [],
          total: 0,
          meta: {
            hasMore: false,
            nextCursor: null,
          },
        };
      }

      const query = {
        domain: ctx.domainData.domainObj._id,
        communityId: community.communityId,
        postId: input.filter.postId,
        deleted: false,
      };
      const { includePaginationCount = true } = input.pagination || {};
      const [items, total] = await Promise.all([
        CommunityCommentModel.find(query)
          .populate<{
            user: User | null;
          }>({
            path: "user",
            select: "userId name avatar email",
          })
          .exec(),
        includePaginationCount
          ? CommunityCommentModel.countDocuments(query).exec()
          : Promise.resolve(null),
      ]);
      return {
        items: items.map((comment) => ({
          ...formatComment(comment, ctx.user as any),
          user: comment.user,
        })),
        total: total,
        meta: {
          skip: input.pagination?.skip || 0,
          limit: input.pagination?.take || 10,
        },
      };
    }),

  addComment: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
        postId: z.string(),
        content: z.string().min(1).max(5000),
        parentCommentId: z.string().optional(),
        parentReplyId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const post = await CommunityPostModel.findOne({
        domain: ctx.domainData.domainObj._id,
        communityId: community.communityId,
        postId: input.data.postId,
        deleted: false,
      });
      if (!post) {
        throw new NotFoundException("Post", String(input.data.postId));
      }
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasCommunityPermission(member, Constants.MembershipRole.COMMENT)
      ) {
        throw new AuthorizationException(
          "You are not a member of this community",
        );
      }

      let comment;
      if (input.data.parentCommentId) {
        comment = await CommunityCommentModel.findOne({
          domain: ctx.domainData.domainObj._id,
          communityId: community.communityId,
          postId: post.postId,
          commentId: input.data.parentCommentId,
          deleted: false,
        });

        if (!comment) {
          throw new NotFoundException(
            "Comment",
            String(input.data.parentCommentId),
          );
        }

        const replyId = generateUniqueId();

        if (!input.data.parentReplyId) {
          throw new ValidationException("Parent reply ID is required");
        }

        comment.replies.push({
          replyId: replyId,
          userId: ctx.user.userId,
          content: input.data.content,
          // media: input.data.media,
          parentReplyId: input.data.parentReplyId,
          likes: [],
          media: [],
        });

        await comment.save();

        const postSubscribers = await getPostSubscribersExceptUserId({
          domain: ctx.domainData.domainObj._id,
          postId: post.postId,
          userId: ctx.user.userId,
        });

        await addNotification({
          domain: ctx.domainData.domainObj._id.toString(),
          entityId: replyId,
          entityAction: Constants.NotificationEntityAction.COMMUNITY_REPLIED,
          forUserIds: postSubscribers.map((s) => s.userId),
          userId: ctx.user.userId,
          entityTargetId: comment.commentId,
        });
      } else {
        comment = await CommunityCommentModel.create({
          domain: ctx.domainData.domainObj._id,
          userId: ctx.user.userId,
          communityId: community.communityId,
          postId: post.postId,
          content: input.data.content,
          media: [],
        });

        const postSubscribers = await getPostSubscribersExceptUserId({
          domain: ctx.domainData.domainObj._id,
          postId: post.postId,
          userId: ctx.user.userId,
        });

        await addNotification({
          domain: ctx.domainData.domainObj._id.toString(),
          entityId: post.postId,
          entityAction: Constants.NotificationEntityAction.COMMUNITY_COMMENTED,
          forUserIds: postSubscribers.map((s) => s.userId),
          userId: ctx.user.userId,
        });
      }

      post.commentsCount = post.commentsCount + 1;
      await post.save();

      await addPostSubscription({
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        postId: post.postId,
      });

      return {
        ...formatComment(comment, ctx.user as any),
        user: await UserModel.findOne(
          {
            userId: comment.userId,
          },
          {
            userId: 1,
            name: 1,
            avatar: 1,
            email: 1,
          },
        ),
      };
    }),

  deleteComment: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        communityId: z.string(),
        postId: z.string(),
        commentId: z.string(),
        replyId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const community = await getCommunityObjOrAssert(
        ctx,
        input.data.communityId,
      );
      const post = await CommunityPostModel.findOne({
        domain: ctx.domainData.domainObj._id,
        communityId: community.communityId,
        postId: input.data.postId,
        deleted: false,
      });
      if (!post) {
        throw new NotFoundException("Post", String(input.data.postId));
      }
      let comment = await CommunityCommentModel.findOne({
        domain: ctx.domainData.domainObj._id,
        communityId: community.communityId,
        postId: post.postId,
        commentId: input.data.commentId,
      });
      if (!comment) {
        throw new NotFoundException("Comment", String(input.data.commentId));
      }
      const member = await getMembership(ctx, community.communityId);
      if (
        !member ||
        !hasPermissionToDelete(member, comment, input.data.replyId)
      ) {
        throw new AuthorizationException(
          "You do not have permission to delete this comment",
        );
      }
      if (input.data.replyId) {
        if (
          comment.replies.some((r) => r.parentReplyId === input.data.replyId)
        ) {
          const replyIndex = comment.replies.findIndex(
            (r) => r.replyId === input.data.replyId,
          );
          if (!comment.replies[replyIndex]!.deleted) {
            comment.replies[replyIndex]!.deleted = true;
            if (post.commentsCount > 0) {
              post.commentsCount = post.commentsCount - 1;
            }
          }
        } else {
          comment.replies = comment.replies.filter(
            (r) => r.replyId !== input.data.replyId,
          );
          if (post.commentsCount > 0) {
            post.commentsCount = post.commentsCount - 1;
          }
        }
        await comment.save();
      } else {
        if (comment.replies.length) {
          if (!comment.deleted) {
            comment.deleted = true;
            await comment.save();
            if (post.commentsCount > 0) {
              post.commentsCount = post.commentsCount - 1;
            }
          }
        } else {
          await comment.deleteOne({
            domain: ctx.domainData.domainObj._id,
            communityId: community.communityId,
            postId: post.postId,
            commentId: comment.commentId,
          });
          if (post.commentsCount > 0) {
            post.commentsCount = post.commentsCount - 1;
          }
          comment = null;
        }
      }
      await post.save();
      return comment
        ? {
            ...formatComment(comment, ctx.user as any),
            user: await UserModel.findOne(
              {
                userId: comment.userId,
              },
              {
                userId: 1,
                name: 1,
                avatar: 1,
                email: 1,
              },
            ),
          }
        : null;
    }),
});
