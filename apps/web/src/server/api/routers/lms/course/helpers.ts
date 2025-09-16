import { responses } from "@/config/strings";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
  ValidationException,
} from "@/server/api/core/exceptions";
import { MainContextType } from "@/server/api/core/procedures";
import { deleteMedia } from "@/server/services/media";
import { InternalCourse } from "@workspace/common-logic";
import { Constants, UIConstants } from "@workspace/common-models";
import mongoose from "mongoose";
import { getPlans } from "../../community/helpers";
import { checkOwnershipWithoutModel } from "@/server/api/core/permissions";
import { checkPermission } from "@workspace/utils";

export const getGroupedLessons = async (
  courseId: string,
  domainId: mongoose.Types.ObjectId,
) => {
  const course = await CourseModel.findOne({
    courseId: courseId,
    domain: domainId,
  });
  if (!course) {
    throw new Error("Course not found");
  }
  const allLessons = await LessonModel.find(
    {
      lessonId: {
        $in: [...course.lessons],
      },
      domain: domainId,
    },
    {
      lessonId: 1,
      groupId: 1,
    },
  );
  const lessonsInSequentialOrder = [];
  for (let group of course.groups.sort((a, b) => a.rank - b.rank)) {
    lessonsInSequentialOrder.push(
      ...allLessons
        .filter((lesson) => lesson.groupId === group.groupId)
        .sort(
          (a, b) =>
            group.lessonsOrder?.indexOf(a.lessonId) -
            group.lessonsOrder?.indexOf(b.lessonId),
        ),
    );
  }
  return lessonsInSequentialOrder;
};

export const getPrevNextCursor = async (
  courseId: string,
  domainId: mongoose.Types.ObjectId,
  lessonId?: string,
) => {
  const lessonsInSequentialOrder = await getGroupedLessons(courseId, domainId);
  const indexOfCurrentLesson = lessonId
    ? lessonsInSequentialOrder.findIndex((item) => item.lessonId === lessonId)
    : -1;

  return {
    prevLesson:
      indexOfCurrentLesson - 1 < 0
        ? ""
        : lessonsInSequentialOrder[indexOfCurrentLesson - 1]!.lessonId,
    nextLesson:
      indexOfCurrentLesson + 1 > lessonsInSequentialOrder.length - 1
        ? ""
        : lessonsInSequentialOrder[indexOfCurrentLesson + 1]!.lessonId,
  };
};

// TODO: refactor this as it might not be deleting the media
export const deleteAllLessons = async (
  courseId: string,
  ctx: MainContextType,
) => {
  const allLessonsWithMedia = await LessonModel.find(
    {
      courseId,
      domain: ctx.domainData.domainObj._id,
      mediaId: { $ne: null },
    },
    {
      mediaId: 1,
    },
  );
  for (let l of allLessonsWithMedia) {
    if (l.media) {
      await deleteMedia(l.media);
    }
  }
  await LessonModel.deleteMany({
    courseId,
    domain: ctx.domainData.domainObj._id,
  });
};

export const validateCourse = async (
  courseData: InternalCourse,
  ctx: MainContextType,
) => {
  if (courseData.type === Constants.CourseType.BLOG) {
    if (!courseData.description) {
      throw new ValidationException(responses.blog_description_empty);
    }

    if (courseData.lessons && courseData.lessons.length) {
      throw new ConflictException(responses.cannot_convert_to_blog);
    }
  }

  // if (courseData.costType !== constants.costPaid) {
  //     courseData.cost = 0;
  // }

  // if (courseData.costType === constants.costPaid && courseData.cost < 0) {
  //     throw new Error(responses.invalid_cost);
  // }

  // if (
  //     courseData.type === constants.course &&
  //     courseData.costType === constants.costEmail
  // ) {
  //     throw new Error(responses.courses_cannot_be_downloaded);
  // }

  // if (courseData.costType === constants.costPaid && courseData.cost > 0) {
  //     await validatePaymentMethod(ctx.subdomain._id.toString());
  // }

  if (
    courseData.type === Constants.CourseType.COURSE ||
    courseData.type === Constants.CourseType.DOWNLOAD
  ) {
    if (courseData.published && courseData.paymentPlans.length === 0) {
      throw new ConflictException(responses.payment_plan_required);
    }

    if (
      courseData.type === Constants.CourseType.DOWNLOAD &&
      courseData.leadMagnet
    ) {
      const paymentPlans = await getPlans({
        planIds: courseData.paymentPlans,
        domainId: ctx.domainData.domainObj._id,
      });
      if (
        paymentPlans.length === 0 ||
        paymentPlans.length > 1 ||
        paymentPlans.some(
          (plan) => plan.type !== Constants.PaymentPlanType.FREE,
        )
      ) {
        throw new ConflictException(responses.lead_magnet_invalid_settings);
      }
    }
  }

  return courseData;
};
export const getCourseOrThrow = async (
  id: mongoose.Types.ObjectId | undefined,
  ctx: {
    user: {
      _id: mongoose.Types.ObjectId | string;
      userId: mongoose.Types.ObjectId | string;
      permissions: string[];
    };
    domainData: { domainObj: { _id: mongoose.Types.ObjectId } };
  },
  courseId?: string,
) => {
  const query = courseId
    ? {
        courseId,
      }
    : {
        _id: id,
      };

  const course = await CourseModel.findOne({
    ...query,
    domain: ctx.domainData.domainObj._id,
  });

  if (!course) {
    throw new NotFoundException("Course", String(courseId || id));
  }

  if (
    !checkPermission(ctx.user.permissions, [
      UIConstants.permissions.manageAnyCourse,
    ])
  ) {
    if (!checkOwnershipWithoutModel(course, ctx)) {
      throw new NotFoundException("Course", String(courseId || id));
    } else {
      if (
        !checkPermission(ctx.user.permissions, [
          UIConstants.permissions.manageCourse,
        ])
      ) {
        throw new AuthorizationException(
          `You are not allowed to manage this course`,
        );
      }
    }
  }

  return course;
};

export const syncCourseLessons = async (courseId: string, ctx: MainContextType) => {
  const course = await getCourseOrThrow(undefined, ctx, courseId);
  const existingLessons = await LessonModel.find({
    courseId,
    domain: ctx.domainData.domainObj._id,
  }).select('lessonId groupId');

  const allLessonIds = existingLessons.map(lesson => lesson.lessonId);
  course.lessons = Array.from(new Set(allLessonIds));
  
  course.groups = course.groups.map(group => {
    const groupLessons = existingLessons
      .filter(lesson => lesson.groupId === group.groupId)
      .map(lesson => lesson.lessonId);
    
    const existingOrderedLessons = group.lessonsOrder.filter(id => groupLessons.includes(id));
    const newLessons = groupLessons.filter(id => !group.lessonsOrder.includes(id));
    
    return {
      ...group,
      lessonsOrder: Array.from(new Set([...existingOrderedLessons, ...newLessons]))
    };
  });

  await course.save();
  return course;
};
