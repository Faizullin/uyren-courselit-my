import constants from "@/config/constants";
import { responses } from "@/config/strings";
import CourseModel from "@/models/Course";
import LessonModel, { Lesson } from "@/models/Lesson";
import { AssignmentModel, QuizModel } from "@/models/lms";
import MembershipModel from "@/models/Membership";
import {
  AuthenticationException,
  AuthorizationException,
  ConflictException,
  NotFoundException,
  ValidationException,
} from "@/server/api/core/exceptions";
import { checkOwnershipWithoutModel } from "@/server/api/core/permissions";
import {
  createDomainRequiredMiddleware,
  createPermissionMiddleware,
  MainContextType,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/core/procedures";
import { getFormDataSchema } from "@/server/api/core/schema";
import { router } from "@/server/api/core/trpc";
import {
  mediaWrappedFieldValidator,
  textEditorContentValidator,
} from "@/server/api/core/validators";
import {
  BASIC_PUBLICATION_STATUS_TYPE,
  Constants,
  UIConstants,
} from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { RootFilterQuery } from "mongoose";
import { z } from "zod";
import { getPrevNextCursor } from "./helpers";

const { permissions } = UIConstants;

const getLessonOrThrow = async (id: string, ctx: MainContextType) => {
  const lesson = await LessonModel.findOne({
    lessonId: id,
    domain: ctx.domainData.domainObj._id,
  });

  if (!lesson) {
    throw new NotFoundException("Lesson", id);
  }

  if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
    if (!checkOwnershipWithoutModel(lesson, ctx)) {
      throw new NotFoundException("Lesson", id);
    } else {
      if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new AuthorizationException(
          "You are not allowed to update this lesson",
        );
      }
    }
  }

  return lesson;
};
type LessonValidatorProps = {
  type?: Lesson["type"];
  content?: Lesson["content"];
  media?: Lesson["media"];
};
export const lessonValidator = (lessonData: LessonValidatorProps) => {
  if (lessonData.content) {
    validateTextContent(lessonData);
  }
};
function validateTextContent(lessonData: LessonValidatorProps) {
  const content = lessonData.content;

  if ([constants.text, constants.embed].includes(lessonData.type as any)) {
    if (
      lessonData.type === constants.text &&
      content &&
      typeof content === "object"
    ) {
      return;
    }

    throw new ValidationException(responses.content_cannot_be_null);
  }

}
const updateLesson = async ({
  lessonData,
  ctx,
}: {
  lessonData: Partial<
    Pick<
      Lesson,
      | "title"
      | "content"
      | "media"
      | "downloadable"
      | "requiresEnrollment"
      | "type"
    >
  > & { lessonId: string };
  ctx: MainContextType;
}) => {
  let lesson = await getLessonOrThrow(lessonData.lessonId, ctx);
  lessonData.lessonId = lessonData.lessonId;

  lessonData.type = lesson.type;
  lessonValidator(lessonData as LessonValidatorProps);

  for (const key of Object.keys(lessonData)) {
    (lesson as any)[key] = (lessonData as any)[key];
  }

  lesson = await (lesson as any).save();
  return lesson;
};

export const lessonRouter = router({
  getById: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        lessonId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return getLessonOrThrow(input.lessonId, ctx as MainContextType);
    }),
  create: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageCourse]))
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(100),
        content: textEditorContentValidator(),
        type: z.nativeEnum(Constants.LessonType),
        downloadable: z.boolean(),
        requiresEnrollment: z.boolean(),
        media: mediaWrappedFieldValidator().optional(),
        groupId: z.string().min(1),
        courseId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      lessonValidator(input.data);

      const course = await CourseModel.findOne({
        courseId: input.data.courseId,
        domain: ctx.domainData.domainObj._id,
      });
      if (!course) throw new NotFoundException("Course", input.data.courseId);
      if (course.isBlog)
        throw new ConflictException(responses.cannot_add_to_blogs); // TODO: refactor this
      const group = course.groups.find(
        (group) => group.groupId === input.data.groupId,
      );
      if (!group) throw new NotFoundException("Group", input.data.groupId);
      const lesson = await LessonModel.create({
        domain: ctx.domainData.domainObj._id,
        title: input.data.title,
        type: input.data.type,
        content: input.data.content,
        media: input.data.media,
        downloadable: input.data.downloadable,
        creatorId: ctx.user._id, // TODO: refactor this
        courseId: course.courseId,
        groupId: input.data.groupId,
        requiresEnrollment: input.data.requiresEnrollment,
      });
      const newLessonIds = Array.from(
        new Set([...course.lessons, lesson.lessonId]),
      );
      course.lessons = newLessonIds;
      const newLessonsOrder = Array.from(
        new Set([...group.lessonsOrder, lesson.lessonId]),
      );
      group.lessonsOrder = newLessonsOrder;
      await course.save();

      return lesson;
    }),
  update: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      getFormDataSchema({
        title: z.string().min(1).max(100).optional(),
        content: textEditorContentValidator().optional(),
        type: z.nativeEnum(Constants.LessonType).optional(),
        downloadable: z.boolean().optional(),
        requiresEnrollment: z.boolean().optional(),
        media: mediaWrappedFieldValidator().nullable().optional(),
      }).extend({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateLesson({
        lessonData: {
          title: input.data.title,
          content: input.data.content,
          type: input.data.type,
          downloadable: input.data.downloadable,
          requiresEnrollment: input.data.requiresEnrollment,
          media: input.data.media as any,
          lessonId: input.id,
        },
        ctx: ctx as MainContextType,
      });
    }),
  delete: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        lessonId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lesson = await getLessonOrThrow(input.lessonId, ctx as any);
      let course = await CourseModel.findOne({
        domain: ctx.domainData.domainObj._id,
      }).elemMatch("lessons", { $eq: lesson.lessonId });
      if (!course) {
        throw new NotFoundException("Course", lesson.courseId);
      }

      const newLessonIds = course.lessons.filter(
        (item) => item !== lesson.lessonId,
      );
      course.groups = course.groups.map((group) => ({
        ...group,
        lessonsOrder: group.lessonsOrder.filter(
          (item) => item !== lesson.lessonId,
        ),
      }));
      course.lessons = Array.from(new Set(newLessonIds));
      await course.save();


      await LessonModel.deleteOne({
        _id: lesson._id,
        domain: ctx.domainData.domainObj._id,
      });
      return true;
    }),

  searchAssignmentEntities: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .use(createPermissionMiddleware([permissions.manageAnyCourse]))
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search } = input;
      const assignmentQuery: RootFilterQuery<typeof AssignmentModel> = {
        domain: ctx.domainData.domainObj._id,
        status: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
      };
      const quizQuery: RootFilterQuery<typeof QuizModel> = {
        domain: ctx.domainData.domainObj._id,
        status: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
      };
      if (search) {
        assignmentQuery.title = { $regex: search, $options: "i" };
        quizQuery.title = { $regex: search, $options: "i" };
      }
      const assignments = await AssignmentModel.find(assignmentQuery);
      const quizzes = await QuizModel.find(quizQuery);
      return {
        assignments,
        quizzes,
      };
    }),

  publicGetById: publicProcedure
    .use(createDomainRequiredMiddleware())
    .input(
      z.object({
        courseId: z.string().min(1),
        lessonId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await CourseModel.findOne({
        courseId: input.courseId,
        domain: ctx.domainData.domainObj._id,
      });
      if (!course) {
        throw new NotFoundException("Course", input.lessonId);
      }
      const lesson = await LessonModel.findOne({
        courseId: input.courseId,
        lessonId: input.lessonId,
        domain: ctx.domainData.domainObj._id,
      });
      if (!lesson) {
        throw new NotFoundException("Lesson", input.lessonId);
      }
      if (lesson.requiresEnrollment) {
        if (!ctx.session?.user) {
          throw new AuthenticationException("You are not authenticated");
        }
        const membership = await MembershipModel.findOne({
          userId: ctx.session.user.userId,
          entityId: lesson.courseId,
          entityType: "course",
          domain: ctx.domainData.domainObj._id,
          status: Constants.MembershipStatus.ACTIVE,
        });
        if (
          !membership &&
          !checkPermission(ctx.session.user.permissions, [
            permissions.manageCourse,
          ])
        ) {
          throw new AuthorizationException(
            "You are not allowed to access this lesson",
          );
        }
      }
      const { nextLesson, prevLesson } = await getPrevNextCursor(
        lesson.courseId,
        ctx.domainData.domainObj._id,
        lesson.lessonId,
      );
      return {
        lessonId: lesson.lessonId,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        media: lesson.media,
        downloadable: lesson.downloadable,
        requiresEnrollment: lesson.requiresEnrollment,
        meta: {
          nextLesson: nextLesson || null,
          prevLesson: prevLesson || null,
        },
      };
    }),
});
