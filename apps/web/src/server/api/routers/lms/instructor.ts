import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { router } from "@/server/api/core/trpc";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { LiveClassModel } from "@workspace/common-logic/models/lms/live-class.model";
import { LiveClassStatusEnum } from "@workspace/common-logic/models/lms/live-class.types";
import { AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { checkPermission } from "@workspace/utils";
import { FilterQuery } from "mongoose";
import { ICourseHydratedDocument } from "@workspace/common-logic/models/lms/course.model";

export const instructorRouter = router({
  // Get instructor dashboard stats with single optimized query
  getDashboardStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([
      UIConstants.permissions.manageCourse,
      UIConstants.permissions.manageAnyCourse,
    ]))
    .query(async ({ ctx }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      // Check if user can see all courses or just their own
      const canSeeAllCourses = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageAnyCourse,
      ]);

      // Build query for courses
      const courseQuery: FilterQuery<ICourseHydratedDocument> = {
        orgId,
        ...(canSeeAllCourses ? {} : { ownerId: userId }),
      };

      // Aggregate course statistics in one query
      const [courseStats, recentCourses, upcomingLiveClasses, pendingSubmissions] = await Promise.all([
        // Get aggregated stats using MongoDB aggregation
        CourseModel.aggregate([
          { $match: courseQuery },
          {
            $group: {
              _id: null,
              totalCourses: { $sum: 1 },
              publishedCourses: {
                $sum: { $cond: ["$published", 1, 0] },
              },
              draftCourses: {
                $sum: { $cond: ["$published", 0, 1] },
              },
              totalStudents: { $sum: "$statsEnrollmentCount" },
              totalRatings: {
                $sum: { $cond: [{ $gt: ["$statsAverageRating", 0] }, "$statsAverageRating", 0] },
              },
              coursesWithRatings: {
                $sum: { $cond: [{ $gt: ["$statsAverageRating", 0] }, 1, 0] },
              },
            },
          },
        ]),

        // Get recent courses
        CourseModel.find(courseQuery)
          .select("_id title shortDescription published publishedAt chapters statsEnrollmentCount statsAverageRating")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Get upcoming live classes for the instructor
        LiveClassModel.find({
          orgId,
          instructorId: userId,
          status: { $in: [LiveClassStatusEnum.SCHEDULED, LiveClassStatusEnum.LIVE] },
          scheduledStartTime: { $gte: new Date() },
        })
          .select("_id title scheduledStartTime scheduledEndTime type status")
          .sort({ scheduledStartTime: 1 })
          .limit(10)
          .lean(),

        // Get pending assignment submissions count
        AssignmentSubmissionModel.countDocuments({
          orgId,
          status: AssignmentSubmissionStatusEnum.SUBMITTED,
        }),
      ]);

      // Process stats
      const stats = courseStats[0] || {
        totalCourses: 0,
        publishedCourses: 0,
        draftCourses: 0,
        totalStudents: 0,
        totalRatings: 0,
        coursesWithRatings: 0,
      };

      const avgRating = stats.coursesWithRatings > 0
        ? Math.round((stats.totalRatings / stats.coursesWithRatings) * 10) / 10
        : 0;

      return jsonify({
        stats: {
          totalCourses: stats.totalCourses,
          publishedCourses: stats.publishedCourses,
          draftCourses: stats.draftCourses,
          totalStudents: stats.totalStudents,
          avgRating,
          pendingSubmissions,
        },
        recentCourses,
        upcomingEvents: upcomingLiveClasses,
      });
    }),

  // Get instructor course analytics
  getCourseAnalytics: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([
      UIConstants.permissions.manageCourse,
      UIConstants.permissions.manageAnyCourse,
    ]))
    .query(async ({ ctx }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      const canSeeAllCourses = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageAnyCourse,
      ]);

      const courseQuery: FilterQuery<ICourseHydratedDocument> = {
        orgId,
        ...(canSeeAllCourses ? {} : { ownerId: userId }),
      };

      // Get course performance metrics
      const analyticsData = await CourseModel.aggregate([
        { $match: courseQuery },
        {
          $project: {
            title: 1,
            statsEnrollmentCount: 1,
            statsCompletionRate: 1,
            statsAverageRating: 1,
            published: 1,
            createdAt: 1,
          },
        },
        { $sort: { statsEnrollmentCount: -1 } },
        { $limit: 10 },
      ]);

      return jsonify({
        topCourses: analyticsData,
      });
    }),
});

