import {
  AuthorizationException,
  NotFoundException,
} from "@/server/api/core/exceptions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema, ListInputSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import { paginate } from "@/server/api/core/utils";
import { documentIdValidator } from "@/server/api/core/validators";
import { jsonify } from "@workspace/common-logic/lib/response";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CohortModel, ICohortHydratedDocument } from "@workspace/common-logic/models/lms/cohort.model";
import {
  EnrollmentModel,
} from "@workspace/common-logic/models/lms/enrollment.model";
import { EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import {
  IScheduleEventHydratedDocument,
  ScheduleEventModel,
} from "@workspace/common-logic/models/lms/schedule.model";
import { RecurrenceTypeEnum, ScheduleStatusEnum, ScheduleTypeEnum } from "@workspace/common-logic/models/lms/schedule.types";
import { IUserHydratedDocument } from "@workspace/common-logic/models/user.model";
import { checkPermission } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";

const getScheduleOrThrow = async (
  id: string,
  ctx: MainContextType,
): Promise<IScheduleEventHydratedDocument> => {
  const schedule = await ScheduleEventModel.findOne({
    _id: id,
    orgId: ctx.domainData.domainObj.orgId,
  });

  if (!schedule) {
    throw new NotFoundException("Schedule Event", id);
  }

  const canAccess =
    schedule.instructorId?.equals(ctx.user._id) ||
    checkPermission(ctx.user.permissions, [
      UIConstants.permissions.manageAnyCourse,
    ]);

  if (!canAccess) {
    throw new AuthorizationException();
  }

  return schedule;
};

export const scheduleRouter = router({
  list: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageCourse]),
    )
    .input(
      ListInputSchema.extend({
        filter: z
          .object({
            cohortId: documentIdValidator().optional(),
            type: z.nativeEnum(ScheduleTypeEnum).optional(),
            status: z.nativeEnum(ScheduleStatusEnum).optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query: RootFilterQuery<typeof ScheduleEventModel> = {
        orgId: ctx.domainData.domainObj.orgId,
      };

      if (input.filter?.cohortId) {
        const cohort = await CohortModel.findOne({
          orgId: ctx.domainData.domainObj.orgId,
          _id: input.filter.cohortId,
        });
        if (!cohort) {
          throw new NotFoundException("Cohort", input.filter.cohortId as string);
        }
        if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
          if (!cohort.ownerId.equals(ctx.user._id) && !cohort.instructorId.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
            throw new AuthorizationException();
          }
        }
        query.cohortId = input.filter.cohortId;
      }

      if (input.filter?.type) {
        query.type = input.filter.type;
      }

      if (input.filter?.status) {
        query.status = input.filter.status;
      }

      if (input.filter?.startDate && input.filter?.endDate) {
        query.$or = [
          {
            startDate: {
              $gte: new Date(input.filter.startDate),
              $lte: new Date(input.filter.endDate),
            },
          },
          {
            endDate: {
              $gte: new Date(input.filter.startDate),
              $lte: new Date(input.filter.endDate),
            },
          },
        ];
      } else if (input.filter?.startDate) {
        query.startDate = { $gte: new Date(input.filter.startDate) };
      } else if (input.filter?.endDate) {
        query.endDate = { $lte: new Date(input.filter.endDate) };
      }

      if (input.search?.q) {
        query.$text = { $search: input.search.q };
      }

      const paginationMeta = paginate(input.pagination);
      const orderBy = input.orderBy || {
        field: "startDate",
        direction: "asc",
      };
      const sortObject: Record<string, 1 | -1> = {
        [orderBy.field]: orderBy.direction === "asc" ? 1 : -1,
      };

      const [items, total] = await Promise.all([
        ScheduleEventModel.find(query)
          .populate<{
            instructor: Pick<
              IUserHydratedDocument,
              "_id" | "username" | "firstName" | "lastName" | "fullName" | "email"
            >;
          }>("instructor", "_id username firstName lastName fullName email")
          .populate<{
            cohort: Pick<ICohortHydratedDocument, "title" | "slug">;
          }>("cohort", "title slug")
          .skip(paginationMeta.skip)
          .limit(paginationMeta.take)
          .sort(sortObject)
          .lean(),
        paginationMeta.includePaginationCount
          ? ScheduleEventModel.countDocuments(query)
          : Promise.resolve(null),
      ]);

      return jsonify({
        items,
        total,
        meta: paginationMeta,
      });
    }),

  // getById: protectedProcedure
  //   .use(createDomainRequiredMiddleware())
  //   .input(z.object({ id: documentIdValidator() }))
  //   .query(async ({ ctx, input }) => {
  //     const schedule = await ScheduleEventModel.findOne({
  //       _id: input.id,
  //       orgId: ctx.domainData.domainObj.orgId,
  //     })
  //       .populate<{
  //         instructor: Pick<
  //           IUserHydratedDocument,
  //           "_id" | "username" | "firstName" | "lastName" | "fullName" | "email"
  //         >;
  //       }>("instructor", "_id username firstName lastName fullName email")
  //       .populate<{
  //         cohort: Pick<ICohortHydratedDocument, "title" | "slug">;
  //       }>("cohort", "title slug")
  //       .lean();

  //     if (!schedule) {
  //       throw new NotFoundException("Schedule Event", input.id);
  //     }

  //     return jsonify(schedule);
  //   }),

  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageCourse]),
    )
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.nativeEnum(ScheduleTypeEnum),
        entityType: z.string(),
        entityId: documentIdValidator(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        allDay: z.boolean().default(false),
        // ✅ recurrence is REQUIRED in model
        recurrence: z.object({
          type: z.nativeEnum(RecurrenceTypeEnum),
          interval: z.number().min(1),
          daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
          endDate: z.string().datetime().optional(),
        }),
        // ✅ location is OPTIONAL in model (entire object)
        location: z.object({
          name: z.string(),
          online: z.boolean().optional(),
          meetingUrl: z.string().url().optional(),
        }).optional(),
        instructorId: documentIdValidator().optional(),
        cohortId: documentIdValidator().optional(),
        // ✅ reminders is REQUIRED in model
        reminders: z.object({
          enabled: z.boolean(),
          minutesBefore: z.array(z.number()),
        }),
        status: z.nativeEnum(ScheduleStatusEnum).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cohort = await CohortModel.findOne({
        _id: input.data.cohortId,
        orgId: ctx.domainData.domainObj.orgId,
      });
      if (!cohort) {
        throw new NotFoundException("Cohort", input.data.cohortId as string);
      }
      if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
        if (!cohort.ownerId.equals(ctx.user._id) && !cohort.instructorId.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
          throw new AuthorizationException();
        }
      }
      const schedule = await ScheduleEventModel.create({
        orgId: ctx.domainData.domainObj.orgId,
        title: input.data.title,
        description: input.data.description,
        type: input.data.type,
        status: input.data.status || ScheduleStatusEnum.ACTIVE,
        entity: {
          entityType: input.data.entityType,
          entityId: new mongoose.Types.ObjectId(input.data.entityId),
          entityIdStr: input.data.entityId,
        },
        startDate: new Date(input.data.startDate),
        endDate: new Date(input.data.endDate),
        allDay: input.data.allDay,
        // ✅ recurrence is always provided
        recurrence: {
          type: input.data.recurrence.type,
          interval: input.data.recurrence.interval,
          daysOfWeek: input.data.recurrence.daysOfWeek,
          endDate: input.data.recurrence.endDate ? new Date(input.data.recurrence.endDate) : undefined,
        },
        // ✅ location is optional
        location: input.data.location,
        instructorId: input.data.instructorId,
        cohortId: input.data.cohortId,
        // ✅ reminders is always provided
        reminders: input.data.reminders,
      });

      return jsonify(schedule.toObject());
    }),

  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageCourse]),
    )
    .input(
      getFormDataSchema(
        {
          title: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          type: z.nativeEnum(ScheduleTypeEnum).optional(),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          allDay: z.boolean().optional(),
          status: z.nativeEnum(ScheduleStatusEnum).optional(),
          // ✅ recurrence is REQUIRED in model (but optional in update)
          recurrence: z.object({
            type: z.nativeEnum(RecurrenceTypeEnum),
            interval: z.number().min(1),
            daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
            endDate: z.string().datetime().optional(),
          }).optional(),
          // ✅ location is OPTIONAL in model
          location: z.object({
            name: z.string(),
            online: z.boolean().optional(),
            meetingUrl: z.string().url().optional(),
          }).optional(),
          instructorId: documentIdValidator().optional(),
          cohortId: documentIdValidator().optional(),
          // ✅ reminders is REQUIRED in model (but optional in update)
          reminders: z.object({
            enabled: z.boolean(),
            minutesBefore: z.array(z.number()),
          }).optional(),
        },
        {
          id: documentIdValidator(),
        },
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const schedule = await getScheduleOrThrow(input.id, ctx);
      if (input.data.title) schedule.title = input.data.title;
      if (input.data.description !== undefined) schedule.description = input.data.description;
      if (input.data.type) schedule.type = input.data.type;
      if (input.data.startDate) schedule.startDate = new Date(input.data.startDate);
      if (input.data.endDate) schedule.endDate = new Date(input.data.endDate);
      if (input.data.allDay !== undefined) schedule.allDay = input.data.allDay;
      if (input.data.status) schedule.status = input.data.status;
      if (input.data.instructorId !== undefined) {
        if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
          console.log("schedule.instructorId", schedule.instructorId, ctx.user._id, ctx.user.roles);
          if (!schedule.instructorId?.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
            throw new AuthorizationException();
          }
        }
        schedule.instructorId = new mongoose.Types.ObjectId(input.data.instructorId);
      }
      if (input.data.cohortId !== undefined) {
        const cohort = await CohortModel.findOne({
          _id: input.data.cohortId,
          orgId: ctx.domainData.domainObj.orgId,
        });
        if (!cohort) {
          throw new NotFoundException("Cohort", input.data.cohortId as string);
        }
        if(!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
          if (!cohort.ownerId.equals(ctx.user._id) && !cohort.instructorId.equals(ctx.user._id) && !ctx.user.roles.includes(UIConstants.roles.admin)) {
            throw new AuthorizationException();
          }
        } 
        schedule.cohortId = new mongoose.Types.ObjectId(input.data.cohortId);
      }
      
      // ✅ Update entire recurrence object
      if (input.data.recurrence) {
        schedule.recurrence = {
            type: input.data.recurrence.type,
            interval: input.data.recurrence.interval,
          daysOfWeek: input.data.recurrence.daysOfWeek,
          endDate: input.data.recurrence.endDate ? new Date(input.data.recurrence.endDate) : undefined,
        };
      }
      
      // ✅ Update entire location object
      if (input.data.location) {
        schedule.location = input.data.location;
      }
      
      // ✅ Update entire reminders object
      if (input.data.reminders) {
        schedule.reminders = input.data.reminders;
      }

      const saved = await schedule.save();
      return jsonify(saved.toObject());
    }),

  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(
      createPermissionMiddleware([UIConstants.permissions.manageCourse]),
    )
    .input(z.object({ id: documentIdValidator() }))
    .mutation(async ({ ctx, input }) => {
      await getScheduleOrThrow(input.id, ctx);

      await ScheduleEventModel.deleteOne({
        _id: input.id,
        orgId: ctx.domainData.domainObj.orgId,
      });

      return { success: true };
    }),
});
