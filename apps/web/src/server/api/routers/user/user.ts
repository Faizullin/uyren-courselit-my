import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator, mediaWrappedFieldValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseEnrollmentMemberTypeEnum, EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { EnrollmentModel } from "@workspace/common-logic/models/lms/enrollment.model";
import { UserProgressModel } from "@workspace/common-logic/models/lms/user-progress.model";
import { UserModel } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";

export const userRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageUsers]),
    )
    .input(ListInputSchema)
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof UserModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };

      if (input.search?.q) {
        query.$text = { $search: input.search.q };
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
        UserModel.find(query)
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? UserModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  getById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageUsers]),
    )
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await UserModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      if (!user) {
        throw new NotFoundException("User", input.id);
      }

      return jsonify(user);
    }),

  getProfile: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const user = await UserModel.findOne({
        _id: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      if (!user) {
        throw new NotFoundException("User", ctx.user._id);
      }

      return jsonify(user);
    }),

  updateProfile: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        username: z.string().min(2).max(100).optional(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatar: mediaWrappedFieldValidator().nullable().optional(),
        subscribedToUpdates: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await UserModel.findOne({
        _id: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!user) {
        throw new NotFoundException("User", ctx.user._id.toString());
      }

      Object.keys(input.data).forEach((key) => {
        (user as any)[key] = (input.data as any)[key];
      });

      const saved = await user.save();
      return jsonify(saved.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageUsers]),
    )
    .input(
      getFormDataSchema(
        {
          username: z.string().min(2).max(100).optional(),
          firstName: z.string().min(1).max(100).optional(),
          lastName: z.string().min(1).max(100).optional(),
          bio: z.string().max(500).optional(),
          avatar: mediaWrappedFieldValidator().nullable().optional(),
          active: z.boolean().optional(),
          permissions: z.array(z.string()).optional(),
          roles: z.array(z.string()).optional(),
          subscribedToUpdates: z.boolean().optional(),
        },
        {
          id: z.string(),
        },
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await UserModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!user) {
        throw new NotFoundException("User", input.id);
      }

      if (user._id.equals(ctx.user._id)) {
        const restrictedKeys = ["permissions", "roles", "active"];
        const hasRestrictedKey = Object.keys(input.data).some((key) =>
          restrictedKeys.includes(key),
        );

        if (hasRestrictedKey) {
          throw new AuthorizationException("You are not authorized to update for yourself");
        }
      }

      Object.keys(input.data).forEach((key) => {
        (user as any)[key] = (input.data as any)[key];
      });

      const saved = await user.save();
      return jsonify(saved.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageUsers]),
    )
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await UserModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!user) {
        throw new NotFoundException("User", input.id);
      }

      if (user._id.equals(ctx.user._id)) {
        throw new AuthorizationException();
      }

      await UserModel.deleteOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      return { success: true };
    }),

  // Get user's enrolled courses (like get_all_memberships)
  getEnrolledCourses: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        userId: documentIdValidator().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = input.userId
        ? new mongoose.Types.ObjectId(input.userId)
        : ctx.user._id;

      // Only allow checking others' enrollments if has permission
      if (
        input.userId &&
        input.userId !== ctx.user._id.toString() &&
        !checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageUsers,
          UIConstants.permissions.manageAnyCourse,
        ])
      ) {
        throw new AuthorizationException();
      }

      const enrollments = await EnrollmentModel.find({
        userId,
        orgId: ctx.domainData.domainObj.orgId,
        status: EnrollmentStatusEnum.ACTIVE,
        memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
      })
        .populate("courseId", "title slug description thumbnail published")
        .sort({ createdAt: -1 })
        .lean();

      // Get progress for each enrollment
      const coursesWithProgress = await Promise.all(
        enrollments.map(async (enrollment) => {
          const progress = await UserProgressModel.findOne({
            userId,
            courseId: enrollment.courseId,
            enrollmentId: enrollment._id,
            orgId: ctx.domainData.domainObj.orgId,
          }).lean();

          const totalLessons = progress?.lessons.length || 0;
          const completedLessons =
            progress?.lessons.filter((l) => l.status === "completed").length || 0;
          const percentComplete =
            totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0;

          return {
            enrollmentId: enrollment._id,
            course: enrollment.courseId,
            progress: {
              totalLessons,
              completedLessons,
              percentComplete,
              currentLesson: progress?.lessons.find((l) => l.status === "in_progress"),
            },
            enrolledAt: (enrollment as any).createdAt,
          };
        }),
      );

      return jsonify(coursesWithProgress);
    }),

  // Get activity streak info (like get_streak_info from Frappe)
  getActivityStreak: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      // Get all activity dates from various collections
      const progressDocs = await UserProgressModel.find({
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .select("updatedAt")
        .lean();

      const enrollmentDocs = await EnrollmentModel.find({
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .select("createdAt")
        .lean();

      // Collect all dates
      const allDates: Date[] = [
        ...progressDocs.map((p) => (p as any).updatedAt),
        ...enrollmentDocs.map((e) => (e as any).createdAt),
      ];

      // Sort and get unique dates (just the date part, no time)
      const uniqueDates = Array.from(
        new Set(
          allDates.map((d) => new Date(d).toISOString().split("T")[0]),
        ),
      ).sort();

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0] || "";

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = uniqueDates[i];
        if (!currentDate) continue;

        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDateStr = uniqueDates[i - 1];
          if (!prevDateStr) continue;

          const prevDate = new Date(prevDateStr);
          const currDate = new Date(currentDate);
          const diffDays = Math.floor(
            (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (diffDays === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }

        longestStreak = Math.max(longestStreak, tempStreak);

        // Check if this is part of current streak
        if (currentDate === today || currentDate === yesterday) {
          currentStreak = tempStreak;
        }
      }

      return jsonify({
        currentStreak,
        longestStreak,
        totalActiveDays: uniqueDates.length,
      });
    }),

  // Get user stats summary
  getUserStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        userId: documentIdValidator().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = input.userId
        ? new mongoose.Types.ObjectId(input.userId)
        : ctx.user._id;

      // Only allow checking others' stats if has permission
      if (
        input.userId &&
        input.userId !== ctx.user._id.toString() &&
        !checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageUsers,
          UIConstants.permissions.manageAnyCourse,
        ])
      ) {
        throw new AuthorizationException();
      }

      const [totalEnrollments, activeEnrollments, progressDocs] = await Promise.all([
        EnrollmentModel.countDocuments({
          userId,
          orgId: ctx.domainData.domainObj.orgId,
          memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
        }),
        EnrollmentModel.countDocuments({
          userId,
          orgId: ctx.domainData.domainObj.orgId,
          memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
          status: EnrollmentStatusEnum.ACTIVE,
        }),
        UserProgressModel.find({
          userId,
          orgId: ctx.domainData.domainObj.orgId,
        }).lean(),
      ]);

      // Calculate completed courses
      const completedCourses = progressDocs.filter((p) => {
        const totalLessons = p.lessons.length;
        const completedLessons = p.lessons.filter(
          (l) => l.status === "completed",
        ).length;
        return totalLessons > 0 && completedLessons === totalLessons;
      }).length;

      // Calculate total lessons completed
      const totalLessonsCompleted = progressDocs.reduce((sum, p) => {
        return (
          sum + p.lessons.filter((l) => l.status === "completed").length
        );
      }, 0);

      return jsonify({
        totalEnrollments,
        activeEnrollments,
        completedCourses,
        totalLessonsCompleted,
        coursesInProgress: activeEnrollments - completedCourses,
      });
    }),
});
