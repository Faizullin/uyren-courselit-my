import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { router } from "@/server/api/core/trpc";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseModel, ICourseHydratedDocument } from "@workspace/common-logic/models/lms/course.model";
import { ScheduleEventModel } from "@workspace/common-logic/models/lms/schedule.model";
import { RecurrenceTypeEnum, ScheduleStatusEnum } from "@workspace/common-logic/models/lms/schedule.types";
import { AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { checkPermission } from "@workspace/utils";
import { FilterQuery } from "mongoose";

function expandRecurringEvents(events: any[], startRange: Date, endRange: Date) {
  const expandedEvents: any[] = [];

  for (const event of events) {
    if (event.recurrence?.type === RecurrenceTypeEnum.NONE || !event.recurrence?.type || event.recurrence?.type === "none") {
      if (new Date(event.startDate) >= startRange && new Date(event.startDate) <= endRange) {
        expandedEvents.push(event);
      }
      continue;
    }

    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const duration = eventEnd.getTime() - eventStart.getTime();
    const recurrenceEnd = event.recurrence.endDate ? new Date(event.recurrence.endDate) : endRange;
    
    let currentDate = new Date(eventStart);
    
    while (currentDate <= endRange && currentDate <= recurrenceEnd) {
      if (currentDate >= startRange) {
        const occurrenceStart = new Date(currentDate);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
        
        let shouldInclude = false;
        
        if (event.recurrence.type === RecurrenceTypeEnum.DAILY) {
          shouldInclude = true;
        } else if (event.recurrence.type === RecurrenceTypeEnum.WEEKLY) {
          const dayOfWeek = occurrenceStart.getDay();
          if (event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
            shouldInclude = event.recurrence.daysOfWeek.includes(dayOfWeek);
          } else {
            shouldInclude = dayOfWeek === eventStart.getDay();
          }
        } else if (event.recurrence.type === RecurrenceTypeEnum.MONTHLY) {
          shouldInclude = occurrenceStart.getDate() === eventStart.getDate();
        }
        
        if (shouldInclude) {
          expandedEvents.push({
            ...event,
            _id: `${event._id}_${occurrenceStart.getTime()}`,
            startDate: occurrenceStart,
            endDate: occurrenceEnd,
            isRecurringInstance: true,
            originalEventId: event._id,
          });
        }
      }
      
      if (event.recurrence.type === RecurrenceTypeEnum.DAILY) {
        currentDate.setDate(currentDate.getDate() + event.recurrence.interval);
      } else if (event.recurrence.type === RecurrenceTypeEnum.WEEKLY) {
        currentDate.setDate(currentDate.getDate() + (7 * event.recurrence.interval));
      } else if (event.recurrence.type === RecurrenceTypeEnum.MONTHLY) {
        currentDate.setMonth(currentDate.getMonth() + event.recurrence.interval);
      }
    }
  }

  return expandedEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

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

      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);

      const [courseStats, recentCourses, scheduleEvents, pendingSubmissions] = await Promise.all([
        CourseModel.aggregate([
          { $match: courseQuery },
          {
            $group: {
              _id: null,
              totalCourses: { $sum: 1 },
              publishedCourses: { $sum: { $cond: ["$published", 1, 0] } },
              draftCourses: { $sum: { $cond: ["$published", 0, 1] } },
              totalStudents: { $sum: "$statsEnrollmentCount" },
              totalRatings: { $sum: { $cond: [{ $gt: ["$statsAverageRating", 0] }, "$statsAverageRating", 0] } },
              coursesWithRatings: { $sum: { $cond: [{ $gt: ["$statsAverageRating", 0] }, 1, 0] } },
            },
          },
        ]),

        CourseModel.find(courseQuery)
          .select("_id title shortDescription published publishedAt chapters statsEnrollmentCount statsAverageRating")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        ScheduleEventModel.find({
          orgId,
          instructorId: userId,
          status: ScheduleStatusEnum.ACTIVE,
          $or: [
            { startDate: { $gte: now, $lte: endOfWeek } },
            { 
              "recurrence.type": { $ne: "none" },
              startDate: { $lte: endOfWeek },
              $or: [
                { "recurrence.endDate": { $exists: false } },
                { "recurrence.endDate": { $gte: now } },
              ],
            },
          ],
        })
          .select("_id title startDate endDate type status recurrence allDay entity")
          .sort({ startDate: 1 })
          .lean(),

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
      const upcomingEvents = expandRecurringEvents(scheduleEvents, now, endOfWeek).slice(0, 10);

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
        upcomingEvents,
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

