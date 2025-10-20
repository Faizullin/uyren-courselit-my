import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { EnrollmentModel, IEnrollmentHydratedDocument } from "@workspace/common-logic/models/lms/enrollment.model";
import { CourseEnrollmentMemberTypeEnum, EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { UserProgressModel } from "@workspace/common-logic/models/lms/user-progress.model";
import { 
  AssignmentModel,
  AssignmentSubmissionModel,
  IAssignmentHydratedDocument,
  IAssignmentSubmissionHydratedDocument
} from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum, AssignmentTypeEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { LiveClassModel } from "@workspace/common-logic/models/lms/live-class.model";
import { LiveClassStatusEnum } from "@workspace/common-logic/models/lms/live-class.types";
import { LiveClassParticipantModel } from "@workspace/common-logic/models/lms/live-class-participant.model";
import { ICourseHydratedDocument } from "@workspace/common-logic/models/lms/course.model";
import { ScheduleEventModel, IScheduleEventHydratedDocument } from "@workspace/common-logic/models/lms/schedule.model";
import { ScheduleStatusEnum, ScheduleTypeEnum } from "@workspace/common-logic/models/lms/schedule.types";
import { ICohortHydratedDocument } from "@workspace/common-logic/models/lms/cohort.model";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import mongoose from "mongoose";
import { z } from "zod";

export const studentRouter = router({
  // Get student dashboard stats with single optimized query
  getDashboardStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const userId = ctx.user._id;
      const orgId = ctx.domainData.domainObj.orgId;

      // Get student's enrolled course IDs
      const activeEnrollments = await EnrollmentModel.find({
        userId,
        orgId,
        status: EnrollmentStatusEnum.ACTIVE,
        memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
      })
        .select("courseId")
        .lean();

      const enrolledCourseIds = activeEnrollments.map((e) => e.courseId);

      // Parallel queries for all student data
      const [enrollments, progressData, upcomingAssignments, upcomingEvents] = await Promise.all([
        // Get recent enrollments with course details
        EnrollmentModel.find({
          userId,
          orgId,
          status: EnrollmentStatusEnum.ACTIVE,
          memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
        })
          .populate<{
            course: Pick<ICourseHydratedDocument, "_id" | "title" | "featuredImage">;
          }>("course", "_id title featuredImage")
          .select("_id courseId createdAt")
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

        // Get upcoming assignments (not yet submitted or in draft)
        AssignmentModel.find({
          orgId,
          courseId: { $in: enrolledCourseIds },
          dueDate: { $gte: new Date() },
          publicationStatus: "published",
        })
          .populate<{
            course: Pick<ICourseHydratedDocument, "_id" | "title">;
          }>("course", "_id title")
          .select("_id title courseId dueDate totalPoints type")
          .sort({ dueDate: 1 })
          .limit(10)
          .lean()
          .then(async (assignments) => {
            // Check submission status for each assignment
            const assignmentIds = assignments.map((a) => a._id);
            const submissions = await AssignmentSubmissionModel.find({
              userId,
              orgId,
              assignmentId: { $in: assignmentIds },
              status: { $in: [AssignmentSubmissionStatusEnum.SUBMITTED, AssignmentSubmissionStatusEnum.GRADED] },
            })
              .select("assignmentId")
              .lean();

            const submittedAssignmentIds = new Set(
              submissions.map((s) => s.assignmentId.toString())
            );

            // Filter out already submitted assignments
            return assignments.filter(
              (a) => !submittedAssignmentIds.has(a._id.toString())
            );
          }),

        // Get upcoming events from schedule
        ScheduleEventModel.find({
          orgId,
          status: { $in: [ScheduleStatusEnum.ACTIVE] },
          startDate: { $gte: new Date() },
          $or: [
            { "entity.entityId": { $in: enrolledCourseIds.map(id => new mongoose.Types.ObjectId(id.toString())) } },
            { instructorId: { $exists: true } },
          ],
        })
          .populate<{
            instructor: Pick<IUserHydratedDocument, "_id" | "fullName">;
          }>("instructor", "_id fullName")
          .populate<{
            cohort: Pick<ICohortHydratedDocument, "title">;
          }>("cohort", "title")
          .select("_id title type startDate endDate location status")
          .sort({ startDate: 1 })
          .limit(10)
          .lean(),
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
          pendingAssignments: upcomingAssignments.length,
        },
        recentCourses: enrollments,
        upcomingAssignments,
        upcomingEvents,
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

