import { AssignmentSubmissionModel } from "@/models/lms";
import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { documentIdValidator } from "@/server/api/core/validators";
import { UIConstants } from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

const { permissions } = UIConstants;

export const assignmentSubmissionRouter = router({
  listSubmissions: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            assignmentId: z.string().optional(),
            studentId: z.string().optional(),
            status: z
              .enum(["submitted", "graded", "late", "overdue"])
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof AssignmentSubmissionModel> = {
        domain: ctx.domainData.domainObj._id,
      };
      if (input.filter?.assignmentId)
        query.assignmentId = input.filter.assignmentId;
      if (input.filter?.studentId) query.studentId = input.filter.studentId;
      if (input.filter?.status) query.status = input.filter.status;

      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        AssignmentSubmissionModel.find(query)
          .populate<{
            assignment: {
              _id: string;
              title: string;
              totalPoints: number;
            };
          }>("assignment", "_id title totalPoints")
          .populate<{
            student: {
              userId: string;
              name: string;
              email: string;
            };
          }>("student", "userId name email")
          .skip(input.pagination?.skip || 0)
          .limit(input.pagination?.take || 20)
          .sort(
            input.orderBy
              ? {
                  [input.orderBy.field]:
                    input.orderBy.direction === "asc" ? 1 : -1,
                }
              : { submittedAt: -1 },
          )
          .lean(),
        includeCount
          ? AssignmentSubmissionModel.countDocuments(query)
          : Promise.resolve(0),
      ]);

      return {
        items: items.map((item) => ({
          ...item,
          id: item._id.toString(),
          _id: undefined,
        })),
        total,
        meta: {
          includePaginationCount: input.pagination?.includePaginationCount,
          skip: input.pagination?.skip || 0,
          take: input.pagination?.take || 20,
        },
      };
    }),

  listMine: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            status: z.enum(["submitted", "graded", "late", "overdue"]).optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hasAccess = checkPermission(ctx.user.permissions, [
        permissions.enrollInCourse,
      ]);
      if (!hasAccess) throw new AuthorizationException("No access");

      const query: RootFilterQuery<typeof AssignmentSubmissionModel> = {
        domain: ctx.domainData.domainObj._id,
        userId: ctx.user.userId,
        ...(input.filter?.status ? { status: input.filter.status } : {}),
      } as any;

      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        AssignmentSubmissionModel.find(query)
          .populate<{ assignment: { _id: string; title: string; totalPoints: number } }>(
            "assignment",
            "_id title totalPoints",
          )
          .skip(input.pagination?.skip || 0)
          .limit(input.pagination?.take || 20)
          .sort(
            input.orderBy
              ? {
                  [input.orderBy.field]:
                    input.orderBy.direction === "asc" ? 1 : -1,
                }
              : { submittedAt: -1 },
          )
          .lean(),
        includeCount
          ? AssignmentSubmissionModel.countDocuments(query)
          : Promise.resolve(0),
      ]);

      return {
        items: items.map((item) => ({
          ...item,
          id: (item as any)._id.toString(),
          _id: undefined,
        })),
        total,
        meta: {
          includePaginationCount: input.pagination?.includePaginationCount,
          skip: input.pagination?.skip || 0,
          take: input.pagination?.take || 20,
        },
      };
    }),

  getSubmissionById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      })
        .populate<{
          assignment: {
            _id: string;
            title: string;
            totalPoints: number;
            instructions: string;
          };
        }>("assignment", "_id title totalPoints instructions")
        .populate<{
          student: {
            userId: string;
            name: string;
            email: string;
          };
        }>("student", "userId name email")
        .lean();

      if (!submission) throw new NotFoundException("Submission not found");

      const hasAccess = checkPermission(ctx.user.permissions, [
        permissions.manageAnyCourse,
      ]);
      if (!hasAccess) throw new AuthorizationException("No access");

      return {
        ...submission,
        id: submission._id.toString(),
        _id: undefined,
      };
    }),

  gradeSubmission: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
        data: z.object({
          score: z.number().min(0),
          feedback: z.string().optional(),
          rubricScores: z
            .array(
              z.object({
                criterion: z.string(),
                score: z.number().min(0),
                maxScore: z.number().min(0),
                feedback: z.string().optional(),
              }),
            )
            .optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!submission) throw new NotFoundException("Submission not found");

      submission.score = input.data.score;
      submission.feedback = input.data.feedback;
      submission.status = "graded";
      submission.gradedAt = new Date();

      const json = (await submission.save()).toObject() as any;
      return {
        ...json,
        id: json._id.toString(),
        _id: undefined,
      };
    }),

  createSubmission: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        assignmentId: z.string().min(1),
        content: z.string().optional(),
        attachments: z.array(z.string()).default([]),
        submissionText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.create({
        ...input,
        domain: ctx.domainData.domainObj._id,
        studentId: ctx.user._id,
        submittedAt: new Date(),
        status: "submitted",
      });
      return submission;
    }),

  updateSubmission: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
        data: z.object({
          content: z.string().optional(),
          attachments: z.array(z.string()).optional(),
          submissionText: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
        studentId: ctx.user._id,
      });
      if (!submission) throw new NotFoundException("Submission not found");

      Object.keys(input.data).forEach((key) => {
        (submission as any)[key] = (input.data as any)[key];
      });
      submission.updatedAt = new Date();

      const json = (await submission.save()).toObject() as any;
      return {
        ...json,
        id: json._id.toString(),
        _id: undefined,
      };
    }),

  deleteSubmission: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!submission) throw new NotFoundException("Submission not found");

      await AssignmentSubmissionModel.findByIdAndDelete(input);
      return { success: true };
    }),
});
