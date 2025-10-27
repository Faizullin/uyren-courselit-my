import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import {
  getFormDataSchema,
  ListInputSchema
} from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import {
  documentIdValidator,
  mediaWrappedFieldValidator,
  textEditorContentValidator,
} from "@/server/api/core/validators";
import { getStorageProvider } from "@/server/services/storage-provider";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import {
  CourseModel,
  ICourseHydratedDocument,
} from "@workspace/common-logic/models/lms/course.model";
import { EnrollmentModel } from "@workspace/common-logic/models/lms/enrollment.model";
import { CourseEnrollmentMemberTypeEnum, EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { UserProgressModel } from "@workspace/common-logic/models/lms/user-progress.model";
import { IPaymentPlanHydratedDocument, PaymentPlanModel } from "@workspace/common-logic/models/payment/payment-plan.model";
import { PaymentPlanStatusEnum, PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import { ITagHydratedDocument } from "@workspace/common-logic/models/post/tag.model";
import { IThemeHydratedDocument } from "@workspace/common-logic/models/theme.model";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission, slugify } from "@workspace/utils";
import mongoose, { FilterQuery, RootFilterQuery } from "mongoose";
import { z } from "zod";
import {
  deleteAllLessons,
  getCourseOrThrow,
  syncCourseLessons
} from "./helpers";
import { CourseLevelEnum, CourseStatusEnum, ICourseChapter } from "@workspace/common-logic/models/lms/course.types";
import { ICohortHydratedDocument } from "@workspace/common-logic/models/lms/cohort.model";

// TODO: Add chapter reordering (like Frappe LMS update_chapter_index)
// ✓ Added course progress distribution analytics (getEnrollmentStats)

const addChapter = async ({
  course,
  data,
}: {
  course: ICourseHydratedDocument;
  data: {
    title: string;
    description?: string;
  },
}) => {
  if (course.chapters.some((ch) => ch.title === data.title)) {
    throw new ConflictException("Chapter with this title already exists");
  }
  const maxOrder = course.chapters.reduce((max, ch) => Math.max(max, ch.order), -1);
  course.chapters.push({
    _id: new mongoose.Types.ObjectId(),
    title: data.title,
    description: data.description,
    order: maxOrder + 1,
    lessonOrderIds: [],
  });
  await course.save();
  return course;
};

const removeChapter = async ({
  course,
  chapter,
  ctx,
}: {
  course: ICourseHydratedDocument;
  chapter: ICourseChapter;
  ctx: MainContextType;
}) => {
  if (chapter.lessonOrderIds && chapter.lessonOrderIds.length > 0) {
    throw new ConflictException("Cannot delete chapter with lessons");
  }

  course.chapters = course.chapters.filter((ch) => !ch._id.equals(chapter._id));
  await course.save();
  return course;
};

const updateCourseChapter = async ({
  chapter,
  course,
  data,
  ctx,
}: {
  chapter: ICourseChapter;
  course: ICourseHydratedDocument;
  data: {
    title?: string;
    description?: string;
    lessonOrderIds?: mongoose.Types.ObjectId[];
  };
  ctx: MainContextType;
}) => {
  const $set: any = {};
  if (data.title) {
    if (course.chapters?.some(((ch) => {
      return ch.title === data.title && !ch._id.equals(chapter._id)
    }))) {
      throw new ConflictException("Chapter with this title already exists");
    }

    $set["chapters.$.title"] = data.title;
  }

  if (data.description !== undefined) {
    $set["chapters.$.description"] = data.description;
  }

  if (data.lessonOrderIds) {
    $set["chapters.$.lessonOrderIds"] = Array.from(new Set(data.lessonOrderIds));
  }

  const updatedCourse = await CourseModel.findOneAndUpdate(
    {
      orgId: ctx.domainData.domainObj.orgId,
      _id: course._id,
      "chapters._id": chapter._id,
    },
    { $set },
    { new: true },
  );

  if (!updatedCourse) {
    throw new ConflictException("Chapter not found");
  }
  await syncCourseLessons({ course: updatedCourse, ctx });
  return updatedCourse;
};

export const courseRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([
        UIConstants.permissions.manageCourse,
        UIConstants.permissions.manageAnyCourse,
      ]),
    )
    .input(ListInputSchema.extend({
      filter: z.object({
        published: z.boolean().optional(),
        level: z.nativeEnum(CourseLevelEnum).optional(),
        status: z.nativeEnum(CourseStatusEnum).optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const query: FilterQuery<ICourseHydratedDocument> = {
        orgId: ctx.domainData.domainObj.orgId
      };
      if (
        !checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageAnyCourse,
        ])
      ) {
        query.ownerId = ctx.user._id;
      }
      if (input.filter?.published) query.published = input.filter.published;
      if (input.filter?.level) query.level = input.filter.level;
      if (input.filter?.status) query.status = input.filter.status;
      if (input.filter?.published) query.published = input.filter.published;
      if (input.search?.q) query.$text = { $search: input.search.q };
      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };
      const [items, total] = await Promise.all([
        CourseModel.find(query)
          .populate<{
            owner: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
          }>("owner", "username firstName lastName fullName email")
          .populate<{
            tags: Pick<ITagHydratedDocument, "name">[];
          }>("tags", "name")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? CourseModel.countDocuments(query)
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
    .input(
      z.object({
        id: documentIdValidator(),
        withLessons: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        orgId: ctx.domainData.domainObj.orgId,
        _id: input.id,
      })
        .populate<{
          owner: Pick<IUserHydratedDocument, "_id" | "username" | "firstName" | "lastName" | "fullName" | "email">;
        }>("owner", "username firstName lastName fullName email")
        .populate<{
          paymentPlans: Pick<IPaymentPlanHydratedDocument, "name" | "type" | "status">[];
        }>("paymentPlans", "name type status")
        .populate<{
          tags: Pick<ITagHydratedDocument, "_id" | "name">[];
        }>("tags", "name")
        .populate<{
          theme: Pick<IThemeHydratedDocument, "name">;
        }>("theme", "name")
        .lean();

      if (!course) {
        throw new NotFoundException("Course", input.id);
      }
      return jsonify(course);
    }),

  getStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        orgId: ctx.domainData.domainObj.orgId,
        _id: input.id,
      }).lean();

      if (!course) {
        throw new NotFoundException("Course", input.id);
      }

      // Get all lesson IDs from all chapters
      const allLessonIds = course.chapters.flatMap(ch => ch.lessonOrderIds || []);

      // Fetch all lessons for this course
      const lessons = await LessonModel.find({
        _id: { $in: allLessonIds },
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      // Calculate stats
      const totalLessons = lessons.length;
      const publishedLessons = lessons.filter(l => l.published).length;
      const draftLessons = totalLessons - publishedLessons;
      
      // Calculate total duration if lessons have duration field
      // Assuming duration is in minutes
      const totalDuration = lessons.reduce((acc, lesson) => {
        return acc + ((lesson as any).duration || 0);
      }, 0);

      // Completion rate: percentage of published lessons
      const completionRate = totalLessons > 0 
        ? Math.round((publishedLessons / totalLessons) * 100) 
        : 0;

      return jsonify({
        totalLessons,
        publishedLessons,
        draftLessons,
        totalDuration, // in minutes
        completionRate, // percentage
      });
    }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255),
        courseCode: z.string().min(1).max(50),
        level: z.nativeEnum(CourseLevelEnum).optional(),
        language: z.string().default("en"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.data.title;
      const course = await CourseModel.create({
        orgId: ctx.domainData.domainObj.orgId,
        title: title,
        courseCode: input.data.courseCode,
        level: input.data.level,
        language: input.data.language,
        slug: slugify(title.toLowerCase()),
        ownerId: ctx.user._id,
        durationInWeeks: 0,
        published: false,
        featured: false,
        upcoming: false,
        allowEnrollment: false,
        allowSelfEnrollment: false,
        paidCourse: false,
        status: CourseStatusEnum.IN_PROGRESS,
      });
      const updatedCourse = await addChapter({
        course,
        data: {
          title: "Section #1",
        },
      });
      return jsonify(updatedCourse.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255).optional(),
        slug: z.string().optional(),
        published: z.boolean().optional(),
        shortDescription: z.string().optional(),
        description: textEditorContentValidator().optional(),
        featuredImage: mediaWrappedFieldValidator().nullable().optional(),
        level: z.nativeEnum(CourseLevelEnum).optional(),
        status: z.nativeEnum(CourseStatusEnum).optional(),
        durationInWeeks: z.number().optional(),
        featured: z.boolean().optional(),
        upcoming: z.boolean().optional(),
        allowEnrollment: z.boolean().optional(),
        allowSelfEnrollment: z.boolean().optional(),
        paidCourse: z.boolean().optional(),
        themeId: documentIdValidator().nullish(),
        instructors: z.array(z.object({
          userId: documentIdValidator(),
          firstName: z.string(),
          lastName: z.string(),
          fullName: z.string(),
        })).optional(),
      }, {
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({ ctx, courseId: input.id });
      if (input.data.instructors !== undefined) {
        if (!ctx.user.roles.includes(UIConstants.roles.admin)) {
          throw new AuthorizationException();
        }
      }
      const updatedCourse = await CourseModel.findOneAndUpdate(
        { _id: course.id, orgId: ctx.domainData.domainObj.orgId },
        { $set: input.data },
        { new: true },
      );
      if (!updatedCourse) {
        throw new NotFoundException("Course", input.id);
      }
      return jsonify(updatedCourse.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({
        ctx,
        courseId: input.id,
      });
      await deleteAllLessons(course, ctx);
      if (course.featuredImage) {
        await getStorageProvider(course.featuredImage.storageProvider).deleteFile(course.featuredImage);
      }
      await CourseModel.deleteOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      return {
        success: true,
      };
    }),


  addCourseChapter: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
      }, {
        courseId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({ ctx, courseId: input.courseId });
      const updatedCourse = await addChapter({
        course,
        data: {
          title: input.data.title,
          description: input.data.description,
        },
      });
      return jsonify(updatedCourse.toObject());
    }),

  updateCourseChapter: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().optional(),
        description: z.string().optional(),
        lessonOrderIds: z.array(documentIdValidator()).optional(),
      }, {
        courseId: documentIdValidator(),
        chapterId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({ ctx, courseId: input.courseId });
      const chapter = course.chapters.find((ch) => ch._id.equals(input.chapterId));
      if (!chapter) {
        throw new NotFoundException("Chapter", input.chapterId);
      }
      const updatedCourse = await updateCourseChapter({
        chapter,
        course,
        data: {
          title: input.data.title,
          description: input.data.description,
          lessonOrderIds: input.data.lessonOrderIds?.map(id => new mongoose.Types.ObjectId(id)),
        },
        ctx,
      });
      return jsonify(updatedCourse.toObject());
    }),

  removeCourseChapter: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        chapterId: documentIdValidator(),
        courseId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({ ctx, courseId: input.courseId });
      const chapter = course.chapters.find((ch) => ch._id.toString() === input.chapterId);
      if (!chapter) {
        throw new ConflictException("Chapter not found");
      }
      const updatedCourse = await removeChapter({
        course,
        chapter,
        ctx,
      });
      return jsonify(updatedCourse.toObject());
    }),

  reorderStructure: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(
      z.object({
        courseId: documentIdValidator(),
        chapters: z.array(z.object({
          chapterId: z.string(),
          order: z.number(),
          lessonOrderIds: z.array(documentIdValidator()).optional(),
        })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({ ctx, courseId: input.courseId });

      // Update order and lesson order for each chapter
      input.chapters.forEach(({ chapterId, order, lessonOrderIds }) => {
        const chapter = course.chapters.find(ch => ch._id.toString() === chapterId);
        if (chapter) {
          chapter.order = order;
          if (lessonOrderIds) {
            chapter.lessonOrderIds = lessonOrderIds.map(id => new mongoose.Types.ObjectId(id));
          }
        }
      });

      await course.save();
      
      // Sync to ensure all lesson IDs are valid
      await syncCourseLessons({ course, ctx });
      
      return jsonify(course.toObject());
    }),

  publicList: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(ListInputSchema.extend({
      filter: z.object({
        level: z.nativeEnum(CourseLevelEnum).optional(),
        status: z.nativeEnum(CourseStatusEnum).optional(),
        language: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof CourseModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };
      if (input.filter?.level) query.level = input.filter.level;
      if (input.filter?.status) query.status = input.filter.status;
      if (input.filter?.language) query.language = input.filter.language;
      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "createdAt",
        direction: "desc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };
      const [items, total] = await Promise.all([
        CourseModel.find(query)
          .populate<{
            owner: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
          }>("owner", "username firstName lastName fullName email")
          .populate<{
            tags: Pick<ITagHydratedDocument, "name">[];
          }>("tags", "name")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? CourseModel.countDocuments(query)
          : Promise.resolve(null),
      ]);
      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  publicGetById: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
        published: true,
      })
        .populate<{
          owner: Pick<IUserHydratedDocument, "_id" | "username" | "firstName" | "lastName" | "fullName" | "email">;
        }>("owner", "username firstName lastName fullName email")
        .populate<{
          paymentPlans: Pick<IPaymentPlanHydratedDocument, "_id" | "name" | "type" | "status">[];
        }>("paymentPlans", "name type status")
        .populate<{
          tags: Pick<ITagHydratedDocument, "_id" | "name">[];
        }>("tags", "name")
        .lean();

      if (!course) {
        throw new NotFoundException("Course", input.id);
      }

      return jsonify(course);
    }),

  publicGetByIdDetailed: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
        published: true,
      })
        .populate<{
          owner: Pick<IUserHydratedDocument, "_id" | "username" | "firstName" | "lastName" | "fullName" | "email">;
        }>("owner", "username firstName lastName fullName email")
        .populate<{
          paymentPlans: Pick<IPaymentPlanHydratedDocument, "_id" | "name" | "type" | "status" | "oneTimeAmount" | "emiAmount" | "subscriptionMonthlyAmount" | "subscriptionYearlyAmount" | "currency">[];
        }>("paymentPlans", "name type status oneTimeAmount emiAmount subscriptionMonthlyAmount subscriptionYearlyAmount currency")
        .populate<{
          tags: Pick<ITagHydratedDocument, "_id" | "name">[];
        }>("tags", "name")
        .lean();

      if (!course) {
        throw new NotFoundException("Course", input.id);
      }

      // Fetch all lessons for this course that are published
      const allLessons = await LessonModel.find({
        courseId: course._id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .select("_id title slug type requiresEnrollment media downloadable")
        .lean();

      // Create a map for quick lesson lookup
      const lessonMap = new Map(
        allLessons.map((lesson) => [lesson._id.toString(), lesson])
      );

      // Build the learning path structure: course > chapters > lessons
      const chaptersWithLessons = course.chapters
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
          _id: chapter._id,
          title: chapter.title,
          description: chapter.description,
          order: chapter.order,
          lessons: chapter.lessonOrderIds
            .map((lessonId) => lessonMap.get(lessonId.toString()))
            .filter(Boolean), // Remove any lessons that don't exist or aren't published
        }));

      return jsonify({
        ...course,
        chapters: chaptersWithLessons,
      });
    }),

  createPaymentPlan: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        courseId: documentIdValidator(),
        name: z.string().min(2).max(255),
        type: z.nativeEnum(PaymentPlanTypeEnum),
        status: z.nativeEnum(PaymentPlanStatusEnum).default(PaymentPlanStatusEnum.ACTIVE),
        oneTimeAmount: z.number().min(0).optional(),
        emiAmount: z.number().min(0).optional(),
        emiTotalInstallments: z.number().min(1).max(24).optional(),
        subscriptionMonthlyAmount: z.number().min(0).optional(),
        subscriptionYearlyAmount: z.number().min(0).optional(),
        currency: z.string().length(3).default("USD"),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseOrThrow({
        ctx,
        courseId: input.data.courseId,
      });

      const paymentPlan = await PaymentPlanModel.create({
        orgId: ctx.domainData.domainObj.orgId,
        name: input.data.name,
        type: input.data.type,
        status: input.data.status,
        oneTimeAmount: input.data.oneTimeAmount,
        emiAmount: input.data.emiAmount,
        emiTotalInstallments: input.data.emiTotalInstallments,
        subscriptionMonthlyAmount: input.data.subscriptionMonthlyAmount,
        subscriptionYearlyAmount: input.data.subscriptionYearlyAmount,
        currency: input.data.currency,
        ownerId: ctx.user._id,
        entity: {
          entityType: "course",
          entityIdStr: course._id.toString(),
          entityId: course._id,
        },
        isDefault: input.data.isDefault,
        isInternal: false,
      });

      return jsonify(paymentPlan.toObject());
    }),

  // Check if user is enrolled in course (for public pages)
  checkEnrollment: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        return jsonify({ isEnrolled: false });
      }

      const enrollment = await EnrollmentModel.findOne({
        userId: ctx.session.user.id,
        courseId: input.courseId,
        orgId: ctx.domainData.domainObj.orgId,
        status: EnrollmentStatusEnum.ACTIVE,
      }).lean();

      return jsonify({
        isEnrolled: !!enrollment,
        enrollmentId: enrollment?._id,
      });
    }),

  // Get course enrollment statistics (like get_course_progress_distribution)
  getEnrollmentStats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]),
    )
    .input(
      z.object({
        courseId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getCourseOrThrow({ ctx, courseId: input.courseId });

      // Get all enrollments
      const enrollments = await EnrollmentModel.find({
        courseId: input.courseId,
        orgId: ctx.domainData.domainObj.orgId,
        memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
        status: EnrollmentStatusEnum.ACTIVE,
      }).lean();

      // Get all progress docs
      const progressDocs = await UserProgressModel.find({
        courseId: input.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      // Calculate progress distribution
      const progressMap = new Map(
        progressDocs.map((p) => [p.userId.toString(), p]),
      );

      const distribution = {
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        totalEnrollments: enrollments.length,
      };

      enrollments.forEach((enrollment) => {
        const progress = progressMap.get(enrollment.userId.toString());
        
        if (!progress || progress.lessons.length === 0) {
          distribution.notStarted++;
        } else {
          const totalLessons = progress.lessons.length;
          const completedLessons = progress.lessons.filter(
            (l) => l.status === "completed",
          ).length;

          if (completedLessons === totalLessons && totalLessons > 0) {
            distribution.completed++;
          } else if (completedLessons > 0) {
            distribution.inProgress++;
          } else {
            distribution.notStarted++;
          }
        }
      });

      // Calculate average completion rate
      let totalPercentage = 0;
      enrollments.forEach((enrollment) => {
        const progress = progressMap.get(enrollment.userId.toString());
        if (progress && progress.lessons.length > 0) {
          const completedLessons = progress.lessons.filter(
            (l) => l.status === "completed",
          ).length;
          totalPercentage += (completedLessons / progress.lessons.length) * 100;
        }
      });

      const averageCompletion =
        enrollments.length > 0
          ? Math.round(totalPercentage / enrollments.length)
          : 0;

      return jsonify({
        ...distribution,
        averageCompletion,
      });
    }),

  // Get current user's enrolled courses with progress
  getMyEnrolledCourses: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          status: z.nativeEnum(EnrollmentStatusEnum).optional(),
          level: z.nativeEnum(CourseLevelEnum).optional(),
        }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build enrollment query
      const enrollmentQuery: RootFilterQuery<typeof EnrollmentModel> = {
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
        memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
      };

      // Apply status filter (default to active only)
      if (input.filter?.status) {
        enrollmentQuery.status = input.filter.status;
      } else {
        enrollmentQuery.status = EnrollmentStatusEnum.ACTIVE;
      }

      // Get paginated enrollments
      const paginationMeta = paginate(input.pagination);
      
      const [enrollments, totalEnrollments] = await Promise.all([
        EnrollmentModel.find(enrollmentQuery)
          .select("_id courseId cohortId createdAt status")
          .populate<{
            cohort: Pick<ICohortHydratedDocument, "_id" | "title" | "status" | "beginDate" | "endDate">;
          }>("cohort", "_id title status beginDate endDate")
          .sort({ createdAt: -1 })
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .lean(),
        paginationMeta.includePaginationCount
          ? EnrollmentModel.countDocuments(enrollmentQuery)
          : Promise.resolve(null),
      ]);

      if (enrollments.length === 0) {
        return jsonify({
          items: [],
          total: totalEnrollments,
          meta: paginationMeta,
        });
      }

      const courseIds = enrollments.map((e) => e.courseId);

      // Build course query
      const courseQuery: FilterQuery<ICourseHydratedDocument> = {
        _id: { $in: courseIds },
        orgId: ctx.domainData.domainObj.orgId,
      };

      // Apply search filter if provided
      if (input.search?.q) {
        courseQuery.$text = { $search: input.search.q };
      }

      // Apply level filter if provided
      if (input.filter?.level) {
        courseQuery.level = input.filter.level;
      }

      // Get courses with full data
      const courses = await CourseModel.find(courseQuery)
        .populate<{
          owner: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName">;
        }>("owner", "username firstName lastName fullName")
        .populate<{
          tags: Pick<ITagHydratedDocument, "name">[];
        }>("tags", "name")
        .populate<{
          theme: Pick<IThemeHydratedDocument, "name">;
        }>("theme", "name")
        .lean();

      // Get progress for all courses
      const progressDocs = await UserProgressModel.find({
        userId: ctx.user._id,
        courseId: { $in: courseIds },
        orgId: ctx.domainData.domainObj.orgId,
      }).lean();

      const progressMap = new Map(
        progressDocs.map((p) => [p.courseId.toString(), p]),
      );

      // Create enrollment map for quick lookup
      const enrollmentMap = new Map(
        enrollments.map((e) => [e.courseId.toString(), e]),
      );

      // Combine course data with progress
      const coursesWithProgress = courses.map((course) => {
        const progress = progressMap.get(course._id.toString());
        const enrollment = enrollmentMap.get(course._id.toString()) as {
          _id: mongoose.Types.ObjectId;
          courseId: mongoose.Types.ObjectId;
          cohortId?: mongoose.Types.ObjectId;
          status: EnrollmentStatusEnum;
          createdAt: Date;
          cohort?: {
            _id: mongoose.Types.ObjectId;
            title: string;
            status: string;
            beginDate?: Date;
            endDate?: Date;
          };
        } | undefined;

        const totalLessons = progress?.lessons.length || 0;
        const completedLessons =
          progress?.lessons.filter((l) => l.status === "completed").length || 0;
        const percentComplete =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        return {
          ...course,
          enrollment: {
            _id: enrollment?._id,
            status: enrollment?.status,
            createdAt: enrollment?.createdAt,
          },
          cohort: enrollment?.cohort,
          progress: {
            totalLessons,
            completedLessons,
            percentComplete,
            currentLesson: progress?.lessons.find((l) => l.status === "in_progress"),
          },
        };
      });

      // Sort by enrollment date (most recent first)
      coursesWithProgress.sort((a, b) => {
        const dateA = a.enrollment.createdAt ? new Date(a.enrollment.createdAt).getTime() : 0;
        const dateB = b.enrollment.createdAt ? new Date(b.enrollment.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return jsonify({
        items: coursesWithProgress,
        total: totalEnrollments,
        meta: paginationMeta,
      });
    }),
});