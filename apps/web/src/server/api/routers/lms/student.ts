import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { EnrollmentModel } from "@workspace/common-logic/models/lms/enrollment.model";
import { CourseEnrollmentMemberTypeEnum, EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { UserProgressModel } from "@workspace/common-logic/models/lms/user-progress.model";
import { AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { LiveClassModel } from "@workspace/common-logic/models/lms/live-class.model";
import { LiveClassStatusEnum } from "@workspace/common-logic/models/lms/live-class.types";
import { LiveClassParticipantModel } from "@workspace/common-logic/models/lms/live-class-participant.model";
import { z } from "zod";

export const studentRouter = router({
  // Get student dashboard stats with single optimized query
  getDashboardStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      // Parallel queries for all student data
      const [enrollments, progressData, assignments, upcomingClasses] = await Promise.all([
        // Get active enrollments
        EnrollmentModel.find({
          userId,
          orgId,
          status: EnrollmentStatusEnum.ACTIVE,
          memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
        })
          .populate("course", "title featuredImage")
          .select("courseId createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        // Get overall progress stats
        UserProgressModel.aggregate([
          {
            $match: {
              userId,
              orgId,
            },
          },
          {
            $group: {
              _id: null,
              totalLessons: { $sum: { $size: "$lessons" } },
              completedLessons: {
                $sum: {
                  $size: {
                    $filter: {
                      input: "$lessons",
                      as: "lesson",
                      cond: { $eq: ["$$lesson.status", "completed"] },
                    },
                  },
                },
              },
            },
          },
        ]),

        // Get pending assignments
        AssignmentSubmissionModel.find({
          userId,
          orgId,
          status: AssignmentSubmissionStatusEnum.SUBMITTED,
        })
          .populate("assignment", "title dueDate totalPoints")
          .select("assignmentId status submittedAt")
          .sort({ submittedAt: -1 })
          .limit(5)
          .lean(),

        // Get upcoming live classes
        LiveClassModel.aggregate([
          {
            $match: {
              orgId,
              status: { $in: [LiveClassStatusEnum.SCHEDULED, LiveClassStatusEnum.LIVE] },
              scheduledStartTime: { $gte: new Date() },
            },
          },
          {
            $lookup: {
              from: "liveclassparticipants",
              let: { liveClassId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$liveClassId", "$$liveClassId"] },
                        { $eq: ["$userId", userId] },
                      ],
                    },
                  },
                },
              ],
              as: "participation",
            },
          },
          {
            $match: {
              participation: { $ne: [] },
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              scheduledStartTime: 1,
              scheduledEndTime: 1,
              status: 1,
              type: 1,
            },
          },
          { $sort: { scheduledStartTime: 1 } },
          { $limit: 10 },
        ]),
      ]);

      // Process progress data
      const progress = progressData[0] || {
        totalLessons: 0,
        completedLessons: 0,
      };

      const completionRate = progress.totalLessons > 0
        ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
        : 0;

      return jsonify({
        stats: {
          enrolledCourses: enrollments.length,
          completionRate,
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedLessons,
          pendingAssignments: assignments.length,
        },
        recentCourses: enrollments,
        upcomingAssignments: assignments,
        upcomingClasses,
      });
    }),

  // Get student course progress
  getCourseProgress: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: documentIdValidator().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      const query: any = {
        userId,
        orgId,
      };

      if (input.courseId) {
        query.courseId = input.courseId;
      }

      const progressDocs = await UserProgressModel.find(query)
        .lean();

      const progressWithStats = progressDocs.map((progress) => {
        const totalLessons = progress.lessons.length;
        const completedLessons = progress.lessons.filter(
          (l) => l.status === "completed",
        ).length;
        const percentComplete = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        return {
          courseId: progress.courseId,
          percentComplete,
          totalLessons,
          completedLessons,
        };
      });

      return jsonify(progressWithStats);
    }),

  // Get student grades summary
  getGradesSummary: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      const submissions = await AssignmentSubmissionModel.find({
        userId,
        orgId,
        status: AssignmentSubmissionStatusEnum.GRADED,
      })
        .select("assignmentId score percentageScore gradedAt feedback")
        .sort({ gradedAt: -1 })
        .lean();

      // Calculate average score
      const scoresSum = submissions.reduce(
        (sum, sub) => sum + (sub.score || 0),
        0,
      );

      const averageGrade = submissions.length > 0
        ? Math.round(scoresSum / submissions.length)
        : 0;

      return jsonify({
        averageGrade,
        totalAssignments: submissions.length,
        submissions: submissions.slice(0, 10), // Recent 10
      });
    }),
});

