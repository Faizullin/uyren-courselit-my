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
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator } from "@/server/api/core/validators";
import { ApprovalStatusEnum } from "@workspace/common-logic/lib/approval_status";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CohortModel } from "@workspace/common-logic/models/lms/cohort.model";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { EnrollmentRequestModel } from "@workspace/common-logic/models/lms/enrollment-request.model";
import {
  EnrollmentModel,
} from "@workspace/common-logic/models/lms/enrollment.model";
import { CourseEnrollmentMemberTypeEnum, CourseEnrollmentRoleEnum, EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";

export const enrollmentRequestRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            courseId: documentIdValidator().optional(),
            status: z.nativeEnum(ApprovalStatusEnum).optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof EnrollmentRequestModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };

      if (input.filter?.courseId) {
        query.courseId = input.filter.courseId;
      }

      if (input.filter?.status) {
        query.status = input.filter.status;
      }

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
        EnrollmentRequestModel.find(query)
          .populate<{
            user: Pick<
              IUserHydratedDocument,
              "username" | "firstName" | "lastName" | "fullName" | "email"
            >;
          }>("user", "username firstName lastName fullName email")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? EnrollmentRequestModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  stats: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      z.object({
        courseId: documentIdValidator(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [total, pending, approved, rejected] = await Promise.all([
        EnrollmentRequestModel.countDocuments({
          courseId: input.courseId,
          orgId: ctx.domainData.domainObj.orgId,
        }),
        EnrollmentRequestModel.countDocuments({
          courseId: input.courseId,
          orgId: ctx.domainData.domainObj.orgId,
          status: ApprovalStatusEnum.PENDING,
        }),
        EnrollmentRequestModel.countDocuments({
          courseId: input.courseId,
          orgId: ctx.domainData.domainObj.orgId,
          status: ApprovalStatusEnum.APPROVED,
        }),
        EnrollmentRequestModel.countDocuments({
          courseId: input.courseId,
          orgId: ctx.domainData.domainObj.orgId,
          status: ApprovalStatusEnum.REJECTED,
        }),
      ]);

      return jsonify({
        total,
        pending,
        approved,
        rejected,
      });
    }),

  approve: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
        cohortId: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await EnrollmentRequestModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!request) {
        throw new NotFoundException("Enrollment request", input.id);
      }

      if (request.status !== ApprovalStatusEnum.PENDING) {
        throw new AuthorizationException("Request has already been processed");
      }

      const course = await CourseModel.findOne({
        _id: request.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!course) {
        throw new NotFoundException("Course", request.courseId.toString());
      }

      const existingEnrollment = await EnrollmentModel.findOne({
        courseId: request.courseId,
        userId: request.userId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (existingEnrollment) {
        request.status = ApprovalStatusEnum.APPROVED;
        await request.save();
        return jsonify(request.toObject());
      }

      await CohortModel.updateOne(
        { _id: input.cohortId, orgId: ctx.domainData.domainObj.orgId },
        { $inc: { statsCurrentStudentsCount: 1 } }
      );

      await EnrollmentModel.create({
        courseId: request.courseId,
        userId: request.userId,
        cohortId: input.cohortId,
        orgId: ctx.domainData.domainObj.orgId,
        role: CourseEnrollmentRoleEnum.MEMBER,
        memberType: CourseEnrollmentMemberTypeEnum.STUDENT,
        status: EnrollmentStatusEnum.ACTIVE,
      });

      request.status = ApprovalStatusEnum.APPROVED;
      await request.save();

      return jsonify(request.toObject());
    }),

  reject: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([UIConstants.permissions.manageAnyCourse]))
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await EnrollmentRequestModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!request) {
        throw new NotFoundException("Enrollment request", input.id);
      }

      if (request.status !== ApprovalStatusEnum.PENDING) {
        throw new AuthorizationException("Request has already been processed");
      }

      request.status = ApprovalStatusEnum.REJECTED;
      await request.save();

      return jsonify(request.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        id: documentIdValidator(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await EnrollmentRequestModel.findOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!request) {
        throw new NotFoundException("Enrollment request", input.id);
      }

      const course = await CourseModel.findOne({
        _id: request.courseId,
        orgId: ctx.domainData.domainObj.orgId,
      });

      if (!course) {
        throw new NotFoundException("Course", request.courseId.toString());
      }

      const canDelete = 
        checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse]) ||
        course.ownerId.equals(ctx.user._id);

      if (!canDelete) {
        throw new AuthorizationException("You don't have permission to delete this request");
      }

      await EnrollmentRequestModel.deleteOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      return jsonify({ success: true });
    }),
});

