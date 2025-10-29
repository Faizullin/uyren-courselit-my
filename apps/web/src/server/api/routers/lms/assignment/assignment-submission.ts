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
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { AssignmentModel, AssignmentSubmissionModel, IAssignmentHydratedDocument } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { checkCourseInstructorPermission, CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";
import { checkEnrollmentAccess } from "../course/helpers";


export const assignmentSubmissionRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            assignmentId: documentIdValidator().optional(),
            userId: documentIdValidator().optional(),
            status: z
              .nativeEnum(AssignmentSubmissionStatusEnum)
              .optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof AssignmentSubmissionModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };
      if (input.filter?.assignmentId)
        query.assignmentId = input.filter.assignmentId;
      if (input.filter?.userId) query.userId = input.filter.userId;
      if (input.filter?.status) query.status = input.filter.status;
      const paginationMeta = paginate(input.pagination);
      const [items, total] = await Promise.all([
        AssignmentSubmissionModel.find(query)
          .populate<{
            assignment: Pick<IAssignmentHydratedDocument, "title" | "totalPoints">;
          }>("assignment", "title totalPoints")
          .populate<{
            student: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
          }>("student", "username firstName lastName fullName email")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(
            input.orderBy
              ? {
                [input.orderBy.field]:
                  input.orderBy.direction === "asc" ? 1 : -1,
              }
              : { submittedAt: -1 },
          )
          .lean(),
        paginationMeta.includePaginationCount
          ? AssignmentSubmissionModel.countDocuments(query)
          : Promise.resolve(0),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  listMine: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            status: z.nativeEnum(AssignmentSubmissionStatusEnum).optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const hasAccess = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.enrollInCourse,
      ]);
      if (!hasAccess) throw new AuthorizationException();

      const query: RootFilterQuery<typeof AssignmentSubmissionModel> = {
        orgId: ctx.domainData.domainObj.orgId,
        userId: ctx.user._id,
        ...(input.filter?.status ? { status: input.filter.status } : {}),
      };

      const paginationMeta = paginate(input.pagination);
      const [items, total] = await Promise.all([
        AssignmentSubmissionModel.find(query)
          .populate<{ assignment: Pick<IAssignmentHydratedDocument, "title" | "totalPoints"> }>(
            "assignment",
            "title totalPoints",
          )
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(
            input.orderBy
              ? {
                [input.orderBy.field]:
                  input.orderBy.direction === "asc" ? 1 : -1,
              }
              : { submittedAt: -1 },
          )
          .lean(),
        paginationMeta.includePaginationCount
          ? AssignmentSubmissionModel.countDocuments(query)
          : Promise.resolve(0),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .populate<{
          assignment: Pick<IAssignmentHydratedDocument, "_id" | "title" | "totalPoints" | "instructions">;
        }>("assignment", "title totalPoints instructions")
        .populate<{
          student: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
        }>("student", "username firstName lastName fullName email")
        .lean();

      if (!submission) throw new NotFoundException("Submission", input.id);

      const hasAccess = checkPermission(ctx.user.permissions, [
        UIConstants.permissions.manageAnyCourse,
      ]);
      if (!hasAccess) throw new AuthorizationException();

      return jsonify(submission);
    }),

  grade: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        score: z.number().min(0),
        feedback: z.string().optional(),
        rubricScores: z.array(z.object({
          criterion: z.string(),
          maxScore: z.number().min(0),
          feedback: z.string().optional(),
        })).optional(),
        status: z.nativeEnum(AssignmentSubmissionStatusEnum).optional(),
      }, {
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!submission) throw new NotFoundException("Submission", input.id);

      submission.score = input.data.score;
      submission.feedback = input.data.feedback;
      submission.status = AssignmentSubmissionStatusEnum.GRADED;
      submission.gradedAt = new Date();
      submission.gradedById = ctx.user._id;
      if (input.data.status) {
        submission.status = input.data.status;
      }
      const saved = await submission.save();
      return jsonify(saved.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        content: z.string().optional(),
        attachments: z.array(z.string()).optional(),
      }, {
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
        userId: ctx.user._id,
      });
      if (!submission) throw new NotFoundException("Submission", input.id);

      Object.keys(input.data).forEach((key) => {
        (submission as any)[key] = (input.data as any)[key];
      });
      const saved = await submission.save();
      return jsonify(saved.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(z.object({
      id: documentIdValidator(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!submission) throw new NotFoundException("Submission", input.id);

      await AssignmentSubmissionModel.findByIdAndDelete(input.id);
      return { success: true };
    }),


    listForAssignment: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(z.object({
      assignmentId: documentIdValidator(),
      not_graded: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment", input.assignmentId);
      const course = await CourseModel.findOne({
        _id: assignment.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!course) throw new NotFoundException("Course", assignment.courseId);
      if (!assignment.ownerId.equals(ctx.user._id) && !checkCourseInstructorPermission(course, ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
        throw new AuthorizationException();
      }
      const query: RootFilterQuery<typeof AssignmentSubmissionModel> = {
        assignmentId: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
      };
      if (input.not_graded) query.status = { $ne: AssignmentSubmissionStatusEnum.GRADED };

      const submissions = await AssignmentSubmissionModel.find(query).populate<{
        student: Pick<IUserHydratedDocument, "_id" | "username" | "firstName" | "lastName" | "fullName" | "email">;
      }>({
        path: "student",
        select: "username firstName lastName fullName email"
      }).lean();

      return jsonify({
        items: submissions,
      });
    }),


  getMyByAssignmentId: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({
      assignmentId: documentIdValidator(),
    }))
    .query(async ({ ctx, input }) => {
      const submission = await AssignmentSubmissionModel.findOne({
        assignmentId: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
        userId: ctx.user._id,
      }).lean();
      return jsonify(submission);
    }),

  saveDraft: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({
      assignmentId: documentIdValidator(),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment", input.assignmentId);

      const enrollment = await checkEnrollmentAccess({
        ctx,
        courseId: assignment.courseId,
      });

      const existingDraft = await AssignmentSubmissionModel.findOne({
        assignmentId: assignment._id,
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
        status: AssignmentSubmissionStatusEnum.DRAFT,
      });

      if (existingDraft) {
        existingDraft.content = input.content || "";
        const saved = await existingDraft.save();
        return jsonify({ success: true, id: saved._id, isDraft: true });
      }

      const submission = await AssignmentSubmissionModel.create({
        orgId: ctx.domainData.domainObj.orgId, 
        assignmentId: assignment._id,
        userId: ctx.user._id,
        status: AssignmentSubmissionStatusEnum.DRAFT,
        content: input.content,
        attachments: [],
        attemptNumber: 0,
        cohortId: enrollment!.cohortId,
      });

      return jsonify({ success: true, id: submission._id, isDraft: true });
    }),

  submitAssignment: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({
      assignmentId: documentIdValidator(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment", input.assignmentId);

      await checkEnrollmentAccess({
        ctx,
        courseId: assignment.courseId,
      });

      const existingDraft = await AssignmentSubmissionModel.findOne({
        assignmentId: assignment._id,
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
        status: AssignmentSubmissionStatusEnum.DRAFT,
      });

      if (!existingDraft) {
        throw new NotFoundException("Draft submission not found. Please save a draft first.");
      }

      if (!input.content && (!existingDraft.attachments || existingDraft.attachments.length === 0)) {
        throw new AuthorizationException("Submission must have content or attachments");
      }

      const maxAttemptNumber = await AssignmentSubmissionModel.findOne({
        assignmentId: assignment._id,
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .sort({ attemptNumber: -1 })
        .select('attemptNumber')
        .lean();

      const nextAttemptNumber = (maxAttemptNumber?.attemptNumber || 0) + 1;

      if (assignment.maxAttempts && nextAttemptNumber > assignment.maxAttempts) {
        throw new AuthorizationException(`Maximum submission attempts (${assignment.maxAttempts}) reached`);
      }

      existingDraft.status = AssignmentSubmissionStatusEnum.SUBMITTED;
      existingDraft.submittedAt = new Date();
      existingDraft.content = input.content;
      existingDraft.attemptNumber = nextAttemptNumber;
      const saved = await existingDraft.save();

      return { success: true, id: saved._id.toString() };
    }),

  resubmit: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(z.object({
      assignmentId: documentIdValidator(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.assignmentId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment", input.assignmentId);

      if (!assignment.maxAttempts || assignment.maxAttempts <= 1) {
        throw new AuthorizationException("Resubmission is not allowed for this assignment");
      }

      const submission = await AssignmentSubmissionModel.findOne({
        assignmentId: assignment._id,
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
        status: { $in: [AssignmentSubmissionStatusEnum.SUBMITTED, AssignmentSubmissionStatusEnum.GRADED] },
      }).sort({ createdAt: -1 });

      if (!submission) {
        throw new NotFoundException("Submission not found");
      }

      const maxAttemptNumber = await AssignmentSubmissionModel.findOne({
        assignmentId: assignment._id,
        userId: ctx.user._id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .sort({ attemptNumber: -1 })
        .select('attemptNumber')
        .lean();

      const currentMaxAttempt = maxAttemptNumber?.attemptNumber || 0;

      if (assignment.maxAttempts && currentMaxAttempt >= assignment.maxAttempts) {
        throw new AuthorizationException(`Maximum submission attempts (${assignment.maxAttempts}) reached`);
      }

      submission.status = AssignmentSubmissionStatusEnum.DRAFT;
      const saved = await submission.save();

      return { success: true, id: saved._id.toString() };
    }),
});
