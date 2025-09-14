import { IQuestion, QuestionModel, QuizModel } from "@/models/lms";
import {
  NotFoundException,
  ValidationException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import {
  UIConstants,
  BASIC_PUBLICATION_STATUS_TYPE,
} from "@workspace/common-models";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";
import { QuestionProviderFactory } from "../question-bank/_providers";
import { ObjectId } from "mongodb";

const findOrAssertQuiz = async (quizId: string, ctx: MainContextType) => {
  const quiz = await QuizModel.findOne({
    _id: quizId,
    domain: ctx.domainData.domainObj._id,
  });
  if (!quiz) throw new NotFoundException("Quiz not found");
  return quiz;
};

const getQuestionProvider = (questionType: IQuestion["type"]) => {
  const provider = QuestionProviderFactory.getProvider(questionType);
  if (!provider) {
    throw new ValidationException(`Unsupported question type: ${questionType}`);
  }
  return provider;
};

const { permissions } = UIConstants;

// Only support question types that have providers
const supportedQuestionTypes = ["multiple_choice", "short_answer"] as const;

export const quizQuestionsRouter = router({
  listQuestions: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      ListInputSchema.extend({
        filter: z.object({
          quizId: documentIdValidator(),
          type: z.enum(supportedQuestionTypes).optional(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await findOrAssertQuiz(input.filter.quizId, ctx as any);
      const query: RootFilterQuery<typeof QuestionModel> = {
        domain: ctx.domainData.domainObj._id,
        _id: { $in: quiz.questionIds },
        ...(input.filter?.type ? { type: input.filter.type } : {}),
      };
      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        QuestionModel.find(query)
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
        includeCount ? QuestionModel.countDocuments(query) : Promise.resolve(0),
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

  publicListQuestions: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z.object({
          quizId: documentIdValidator(),
          type: z.enum(supportedQuestionTypes).optional(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await QuizModel.findOne({
        _id: input.filter.quizId,
        domain: ctx.domainData.domainObj._id,
        status: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
      });
      if (!quiz) throw new NotFoundException("Quiz not found");

      const query: RootFilterQuery<typeof QuestionModel> = {
        domain: ctx.domainData.domainObj._id,
        _id: { $in: quiz.questionIds },
        ...(input.filter?.type ? { type: input.filter.type } : {}),
      };
      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        QuestionModel.find(query)
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
        includeCount ? QuestionModel.countDocuments(query) : Promise.resolve(0),
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

  createQuestion: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        text: z.string().min(1),
        type: z.enum(supportedQuestionTypes),
        points: z.number().min(0),
        explanation: z.string().optional(),
        options: z
          .array(
            z.object({
              uid: z.string(),
              text: z.string(),
              isCorrect: z.boolean(),
            }),
          )
          .optional(),
        correctAnswers: z.array(z.string()).optional(),
      }).extend({
        quizId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await findOrAssertQuiz(input.quizId, ctx as any);
      const question = await QuestionModel.create({
        ...input.data,
        domain: ctx.domainData.domainObj._id,
        teacherId: ctx.user._id,
      });
      const newQuestionIds = Array.from(
        new Set([...quiz.questionIds, question._id]),
      );
      await QuizModel.findByIdAndUpdate(input.quizId, {
        questionIds: newQuestionIds,
        totalPoints: quiz.totalPoints + input.data.points,
      });
      return question;
    }),

  updateQuestion: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
        quizId: documentIdValidator(),
        data: z.any(), // Let the provider handle validation
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await findOrAssertQuiz(input.quizId, ctx as any);
      if (!quiz.questionIds.includes(new ObjectId(input.id)))
        throw new NotFoundException("Question not found");

      const question = await QuestionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!question) throw new NotFoundException("Question not found");

      const provider = getQuestionProvider(question.type);
      const validatedData = provider.getValidatedUpdateData(
        question as any,
        input.data as any,
      );

      const oldPoints = question.points || 0;
      const newPoints = validatedData.points || oldPoints;
      const pointsDifference = newPoints - oldPoints;

      // Update question with validated data
      await QuestionModel.findByIdAndUpdate(input.id, validatedData, {
        new: true,
      });

      // Update quiz total points if points changed
      if (pointsDifference !== 0) {
        await QuizModel.findByIdAndUpdate(input.quizId, {
          $inc: { totalPoints: pointsDifference },
        });
      }

      const updated = await QuestionModel.findById(input.id);
      return updated;
    }),

  deleteQuestion: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
        quizId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await findOrAssertQuiz(input.quizId, ctx as any);
      if (!quiz.questionIds.includes(new ObjectId(input.id)))
        throw new NotFoundException("Question not found");

      const question = await QuestionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!question) throw new NotFoundException("Question not found");

      await QuizModel.findByIdAndUpdate(input.quizId, {
        $pull: { questionIds: question._id },
        $inc: { totalPoints: -(question.points || 0) },
      });
      await QuestionModel.findByIdAndDelete(input.id);
      return { success: true };
    }),

  getQuestionById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
        quizId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const quiz = await findOrAssertQuiz(input.quizId, ctx as any);
      if (!quiz.questionIds.includes(new ObjectId(input.id)))
        throw new NotFoundException("Question not found");

      const question = await QuestionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!question) throw new NotFoundException("Question not found");
      return question;
    }),
});
