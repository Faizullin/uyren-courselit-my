import { AssignmentModel } from "@/models/lms";
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
import { documentIdValidator } from "@/server/api/core/validators";
import {
  UIConstants,
  BASIC_PUBLICATION_STATUS_TYPE,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

const { permissions } = UIConstants;

const CreateAssignmentSchema = getFormDataSchema({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  courseId: z.string().min(1),
  assignmentType: z.enum([
    "essay",
    "project",
    "presentation",
    "file_upload",
    "peer_review",
  ]),
  dueDate: z.date().optional(),
  totalPoints: z.number().min(1).default(100),
  instructions: z.string().optional(),
  requirements: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  allowLateSubmission: z.boolean().default(false),
  latePenalty: z.number().min(0).max(100).default(10),
  maxSubmissions: z.number().min(1).default(1),
  allowResubmission: z.boolean().default(false),
  peerReviewEnabled: z.boolean().default(false),
  rubric: z
    .array(
      z.object({
        criterion: z.string(),
        points: z.number().min(0),
        description: z.string().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  submissionFormat: z
    .enum(["file_upload", "text", "url", "mixed"])
    .default("file_upload"),
  availableFrom: z.date().optional(),
});

export const assignmentRouter = router({
  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(CreateAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.create({
        ...input.data,
        domain: ctx.domainData.domainObj._id,
        ownerId: ctx.user._id,
      });
      return assignment;
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        courseId: z.string().min(1).optional(),
        assignmentType: z
          .enum([
            "essay",
            "project",
            "presentation",
            "file_upload",
            "peer_review",
          ])
          .optional(),
        dueDate: z.date().optional(),
        totalPoints: z.number().min(1).optional(),
        instructions: z.string().optional(),
        requirements: z.array(z.string()).optional(),
        attachments: z.array(z.string()).optional(),
        allowLateSubmission: z.boolean().optional(),
        latePenalty: z.number().min(0).max(100).optional(),
        maxSubmissions: z.number().min(1).optional(),
        allowResubmission: z.boolean().optional(),
        peerReviewEnabled: z.boolean().optional(),
        rubric: z
          .array(
            z.object({
              criterion: z.string(),
              points: z.number().min(0),
              description: z.string().optional(),
            }),
          )
          .optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        status: z.nativeEnum(BASIC_PUBLICATION_STATUS_TYPE).optional(),
        submissionFormat: z
          .enum(["file_upload", "text", "url", "mixed"])
          .optional(),
        availableFrom: z.date().optional(),
      }).extend({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input.id,
        domain: ctx.domainData.domainObj._id,
      });
      if (!assignment) throw new NotFoundException("Assignment not found");

      Object.keys(input.data).forEach((key) => {
        (assignment as any)[key] = (input.data as any)[key];
      });
      const saved = await assignment.save();
      return saved.toObject();
    }),

  archive: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!assignment) throw new NotFoundException("Assignment not found");

      assignment.status = "archived";
      await assignment.save();

      return { success: true };
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const assignment = await AssignmentModel.findOne({
        _id: input,
        domain: ctx.domainData.domainObj._id,
      });
      if (!assignment) throw new NotFoundException("Assignment not found");
      await AssignmentModel.findByIdAndDelete(input);
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

      if (!assignment) throw new NotFoundException("Assignment not found");

      const hasAccess = checkPermission(ctx.user.permissions, [
        permissions.manageAnyCourse,
      ]);
      if (
        !hasAccess &&
        assignment.status === BASIC_PUBLICATION_STATUS_TYPE.DRAFT
      )
        throw new AuthorizationException("No access");

      return {
        ...assignment,
      };
    }),

  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            status: z.enum(["published", "draft", "archived"]).optional(),
            courseId: z.string().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof AssignmentModel> = {
        domain: ctx.domainData.domainObj._id,
      };
      if (input.filter?.status) query.status = input.filter.status;
      if (input.filter?.courseId) query.courseId = input.filter.courseId;
      const includeCount = input.pagination?.includePaginationCount ?? true;
      const [items, total] = await Promise.all([
        AssignmentModel.find(query)
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
        includeCount
          ? AssignmentModel.countDocuments(query)
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
});
