import { QuizModel } from "@/models/lms";
import { QuestionModel } from "@/models/lms";
import {
  AuthorizationException,
  NotFoundException,
  ValidationException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import {
  UIConstants,
  BASIC_PUBLICATION_STATUS_TYPE,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

const CreateSchema = getFormDataSchema({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  courseId: z.string().min(1),
  timeLimit: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).max(10).default(1),
  passingScore: z.number().min(0).max(100).default(60),
  shuffleQuestions: z.boolean().default(true),
  showResults: z.boolean().default(false),
  totalPoints: z.number().min(1).default(0),
});

const { permissions } = UIConstants;

export const quizRouter = router({
  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(CreateSchema)
    .mutation(async ({ ctx, input }) => {
      const quiz = await QuizModel.create({
        ...input.data,
        domain: ctx.domainData.domainObj._id,
        ownerId: ctx.user._id,
        status: BASIC_PUBLICATION_STATUS_TYPE.DRAFT,
      });
      return quiz;
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        courseId: z.string().min(1).optional(),
        timeLimit: z.number().min(1).optional(),
        maxAttempts: z.number().min(1).max(10).optional(),
        passingScore: z.number().min(0).max(100).optional(),
        shuffleQuestions: z.boolean().optional(),
        showResults: z.boolean().optional(),
        totalPoints: z.number().min(1).optional(),
        status: z.nativeEnum(BASIC_PUBLICATION_STATUS_TYPE).optional(),
      }).extend({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!quiz) throw new NotFoundException("Quiz not found");
      Object.keys(input.data).forEach((key) => {
        (quiz as any)[key] = (input.data as any)[key];
      });
      return await quiz.save();
    }),

  archive: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!quiz) throw new NotFoundException("Quiz not found");

      quiz.status = "archived";
      await quiz.save();

      return { success: true };
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!quiz) throw new NotFoundException("Quiz not found");

      await QuizModel.findByIdAndDelete(input);
      return { success: true };
    }),

  getById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      })
        .populate<{
          owner: {
            userId: string;
            name: string;
            email: string;
          };
        }>("owner", "userId name email")
        .populate<{
          course: {
            courseId: string;
            title: string;
          };
        }>("course", "courseId title")
        .lean();

      if (!quiz) throw new NotFoundException("Quiz not found");
      const hasAccess = checkPermission(ctx.user.permissions, [
        permissions.manageAnyCourse,
      ]);
      if (!hasAccess && quiz.status === "draft")
        throw new AuthorizationException("No access");
      return { ...quiz };
    }),

  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            status: z.nativeEnum(BASIC_PUBLICATION_STATUS_TYPE).optional(),
            courseId: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof QuizModel> = {
        domain: ctx.domainData.domainObj._id,
      };
      if (input.filter?.status) query.status = input.filter.status;
      if (input.filter?.courseId) query.courseId = input.filter.courseId;
      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        QuizModel.find(query)

          .populate("owner", "userId name email")
          .populate("course", "courseId title")
          .skip(input.pagination?.skip || 0)
          .limit(input.pagination?.take || 20)
          .sort(
            input.orderBy
              ? {
                  [input.orderBy.field]:
                    input.orderBy.direction === "asc" ? 1 : -1,
                }
              : { createdAt: -1 },
          )
          .lean(),
        includeCount ? QuizModel.countDocuments(query) : Promise.resolve(0),
      ]);
      return {
        items,
        total,
        meta: {
          includePaginationCount: input.pagination?.includePaginationCount,
          skip: input.pagination?.skip || 0,
          take: input.pagination?.take || 20,
        },
      };
    }),

  publicGetByQuizId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        quizId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input.quizId,
        domain: ctx.domainData.domainObj._id,
        ...(checkPermission(ctx.user.permissions, [permissions.manageAnyCourse]) ? {} : { status: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED }),
      })
        .populate<{
          owner: {
            userId: string;
            name: string;
            email: string;
          };
        }>("owner", "userId name email")
        .populate<{
          course: {
            courseId: string;
            title: string;
          };
        }>("course", "courseId title")
        .lean();
      if (!quiz) throw new NotFoundException("Quiz not found");
      return quiz;
    }),

  publicGetByQuizIdWithQuestions: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        quizId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input.quizId,
        domain: ctx.domainData.domainObj._id,
        status: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
      })
        .populate<{
          owner: {
            userId: string;
            name: string;
            email: string;
          };
        }>("owner", "userId name email")
        .populate<{
          course: {
            courseId: string;
            title: string;
          };
        }>("course", "courseId title")
        .lean();

      if (!quiz) throw new NotFoundException("Quiz not found");

      // Fetch questions for this quiz
      const questions = await QuestionModel.find({
        _id: { $in: quiz.questionIds },
        domain: ctx.domainData.domainObj._id,
      }).lean();

      // Process questions to remove sensitive information
      const processedQuestions = questions.map((question: any) => {
        const processed = { ...question };
        // Remove correct answers and other sensitive data
        delete processed.correctAnswers;
        delete processed.explanation;
        if (processed.options) {
          processed.options = processed.options.map((opt: any) => {
            const { isCorrect, ...rest } = opt;
            return rest;
          });
        }
        return processed;
      });

      return {
        ...quiz,
        questions: processedQuestions,
      };
    }),
});
