import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { router } from "@/server/api/core/trpc";
import { Constants } from "@workspace/common-models";
import { z } from "zod";
import { getActivities } from "./helpers";
import constants from "@/config/constants";
import { RootFilterQuery } from "mongoose";

const { activityTypes } = constants;

// Input schema for getting activities
const GetActivitiesInputSchema = z.object({
  params: z.object({
    type: z.enum(activityTypes),
    duration: z.enum(["1d", "7d", "30d", "90d", "1y", "lifetime"]),
    points: z.boolean().optional().default(false),
    growth: z.boolean().optional().default(true),
    entityId: z.string().optional(),
  }),
});

export const activityRouter = router({
  // Get activities with analytics data
  getActivities: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(GetActivitiesInputSchema)
    .query(async ({ ctx, input }) => {
      const { type, duration, points, growth, entityId } = input.params;

      const result = await getActivities({
        ctx: ctx as any,
        type,
        duration,
        points,
        growth,
        entityId,
      });

      return {
        success: true,
        data: result,
      };
    }),

  // Get user's own activities
  getMyActivities: protectedProcedure
    .input(
      z.object({
        type: z
          .enum(Object.values(Constants.ActivityType) as [string, ...string[]])
          .optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { type, limit, offset } = input;

      if (!ctx.domainData.domainObj) {
        throw new Error("Domain not found");
      }

      // Import Activity model dynamically to avoid SSR issues
      const { default: ActivityModel } = await import("@/models/Activity");

      const query: RootFilterQuery<typeof ActivityModel> = {
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
      };

      if (type) {
        query.type = type;
      }

      const activities = await ActivityModel.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const total = await ActivityModel.countDocuments(query);

      return {
        success: true,
        data: {
          activities,
          total,
          meta: {
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      };
    }),

  // Get activity statistics for dashboard
  getActivityStats: protectedProcedure
    .input(
      z.object({
        duration: z
          .enum(["1d", "7d", "30d", "90d", "1y", "lifetime"])
          .default("30d"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { duration } = input;

      if (!ctx.domainData.domainObj) {
        throw new Error("Domain not found");
      }

      const { default: ActivityModel } = await import("@/models/Activity");

      const startDate = new Date();
      startDate.setDate(
        startDate.getDate() -
          (duration === "1d"
            ? 0
            : duration === "7d"
              ? 6
              : duration === "30d"
                ? 29
                : duration === "90d"
                  ? 89
                  : 365),
      );

      const stats = await ActivityModel.aggregate([
        {
          $match: {
            domain: ctx.domainData.domainObj._id,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalValue: { $sum: { $ifNull: ["$metadata.cost", 0] } },
          },
        },
      ]);

      return {
        success: true,
        data: {
          duration,
          stats: stats.reduce(
            (acc, stat) => {
              acc[stat._id] = {
                count: stat.count,
                totalValue: stat.totalValue,
              };
              return acc;
            },
            {} as Record<string, { count: number; totalValue: number }>,
          ),
        },
      };
    }),
});
