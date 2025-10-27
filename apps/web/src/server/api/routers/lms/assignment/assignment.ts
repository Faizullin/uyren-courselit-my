import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator } from "@/server/api/core/validators";
import { PublicationStatusEnum } from "@workspace/common-logic/lib/publication_status";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { AssignmentModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentDifficultyEnum, AssignmentTypeEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { checkCourseInstructorPermission, CourseModel, ICourseHydratedDocument } from "@workspace/common-logic/models/lms/course.model";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";


const CreateAssignmentSchema = getFormDataSchema({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  courseId: documentIdValidator(),
  type: z.nativeEnum(AssignmentTypeEnum),
  beginDate: z.date().optional(),
  dueDate: z.date().optional(),
  scheduledDate: z.date().optional(),
  eventDuration: z.number().min(1).max(480).optional(),
  totalPoints: z.number().min(1).default(100),
  instructions: z.string().optional(),
  requirements: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  allowLateSubmission: z.boolean().default(true),
  latePenalty: z.number().min(0).max(100).default(0),
  maxAttempts: z.number().min(1).optional(),
  allowPeerReview: z.boolean().default(false),
  rubrics: z
    .array(
      z.object({
        criterion: z.string(),
        points: z.number().min(0),
        description: z.string().optional(),
      }),
    )
    .optional(),
  difficulty: z.nativeEnum(AssignmentDifficultyEnum).default(AssignmentDifficultyEnum.MEDIUM),
});

export const assignmentRouter = router({
  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(CreateAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        _id: input.data.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!course) throw new NotFoundException("Course", input.data.courseId);
      if (!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
        if (!course.ownerId.equals(ctx.user._id) && !checkCourseInstructorPermission(course, ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
          throw new AuthorizationException();
        }
      }
      const assignment = await AssignmentModel.create({
        ...input.data,
        orgId: ctx.domainData.domainObj.orgId,
        ownerId: ctx.user._id,
      });
      return jsonify(assignment.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        courseId: documentIdValidator().optional(),
        type: z.nativeEnum(AssignmentTypeEnum).optional(),
        beginDate: z.date().optional(),
        dueDate: z.date().optional(),
        scheduledDate: z.date().optional(),
        eventDuration: z.number().min(1).max(480).optional(),
        totalPoints: z.number().min(1).optional(),
        instructions: z.string().optional(),
        requirements: z.array(z.string()).optional(),
        attachments: z.array(z.string()).optional(),
        allowLateSubmission: z.boolean().optional(),
        latePenalty: z.number().min(0).max(100).optional(),
        maxAttempts: z.number().min(1).optional(),
        allowPeerReview: z.boolean().optional(),
        rubrics: z
          .array(
            z.object({
              criterion: z.string(),
              points: z.number().min(0),
              description: z.string().optional(),
            }),
          )
          .optional(),
        difficulty: z.nativeEnum(AssignmentDifficultyEnum).optional(),
        publicationStatus: z.nativeEnum(PublicationStatusEnum).optional(),
      }, {
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment not found");
      if (!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
        if (!assignment.ownerId.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
          throw new AuthorizationException();
        }
      }
      Object.keys(input.data).forEach((key) => {
        (assignment as any)[key] = (input.data as any)[key];
      });
      const saved = await assignment.save();
      return jsonify(saved.toObject());
    }),

  archive: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(z.object({
      id: documentIdValidator(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment not found");
      if(!ctx.user.roles.includes(UIConstants.roles.admin)) {
        if (!assignment.ownerId.equals(ctx.user._id)) {
          throw new AuthorizationException();
        }
      }

      assignment.publicationStatus = PublicationStatusEnum.ARCHIVED;
      const saved = await assignment.save();

      return jsonify(saved.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageCourse]))
    .input(z.object({
      id: documentIdValidator(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!assignment) throw new NotFoundException("Assignment", input.id);
      if(!ctx.user.roles.includes(UIConstants.roles.admin)) {
        if (!assignment.ownerId.equals(ctx.user._id)) {
          throw new AuthorizationException();
        }
      }
      await AssignmentModel.findByIdAndDelete(input.id);
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
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      })
        .populate<{
          owner: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
        }>("owner", "username firstName lastName fullName email")
        .populate<{
          course: Pick<ICourseHydratedDocument, "title">;
        }>("course", "title")
        .lean();

      if (!assignment) throw new NotFoundException("Assignment", input.id);
      if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
        if (!assignment.ownerId.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
          throw new AuthorizationException();
        }
      }
      return jsonify(assignment);
    }),

  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            publicationStatus: z.nativeEnum(PublicationStatusEnum).optional(),
            courseId: documentIdValidator().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof AssignmentModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };
      if (input.filter?.publicationStatus) query.publicationStatus = input.filter.publicationStatus;
      if (input.filter?.courseId) {
        query.courseId = input.filter.courseId;
        const course = await CourseModel.findOne({
          _id: input.filter.courseId,
          orgId: ctx.domainData.domainObj.orgId,
        });
        if (!course) throw new NotFoundException("Course", input.filter.courseId);
        if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
          if (!course.ownerId.equals(ctx.user._id) && !checkCourseInstructorPermission(course, ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
            throw new AuthorizationException();
          }
        }
      }
      if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
        if(!ctx.user.roles.includes(UIConstants.roles.admin)) {
          query.ownerId = ctx.user._id;
        }
      }
      const paginationMeta = paginate(input.pagination);
      const [items, total] = await Promise.all([
        AssignmentModel.find(query)
          .populate<{
            owner: Pick<IUserHydratedDocument, "username" | "firstName" | "lastName" | "fullName" | "email">;
          }>("owner", "username firstName lastName fullName email")
          .populate<{
            course: Pick<ICourseHydratedDocument, "title">;
          }>("course", "title")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(
            input.orderBy
              ? {
                [input.orderBy.field]:
                  input.orderBy.direction === "asc" ? 1 : -1,
              }
              : { createdAt: -1 },
          )
          .lean(),
        paginationMeta.includePaginationCount
          ? AssignmentModel.countDocuments(query)
          : Promise.resolve(0),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

    publicGetById: publicProcedure
    .input(z.object({
      id: documentIdValidator(),
    }))
    .query(async ({ ctx, input }) => {
      // TODO: add enrollment check
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj!.orgId,
        publicationStatus: PublicationStatusEnum.PUBLISHED,
      }).lean();
      if (!assignment) throw new NotFoundException("Assignment", input.id);
      return jsonify(assignment);
    }),
});
