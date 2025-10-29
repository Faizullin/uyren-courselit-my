import {
  AuthenticationException,
  AuthorizationException,
  NotFoundException
} from "@/server/api/core/exceptions";
import { MainContextType } from "@/server/api/core/procedures";
import { getStorageProvider } from "@/server/services/storage-provider";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { checkCourseInstructorPermission, CourseModel, ICourseHydratedDocument } from "@workspace/common-logic/models/lms/course.model";
import { EnrollmentModel } from "@workspace/common-logic/models/lms/enrollment.model";
import { EnrollmentStatusEnum } from "@workspace/common-logic/models/lms/enrollment.types";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { checkPermission } from "@workspace/utils";
import mongoose from "mongoose";

export const buildInstructorCourseQuery = (
  orgId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  canSeeAllCourses: boolean = false
) => {
  const baseQuery: mongoose.FilterQuery<ICourseHydratedDocument> = { orgId };
  if (canSeeAllCourses) {
    return baseQuery;
  }
  return {
    ...baseQuery,
    $or: [
      { ownerId: userId },
      { "instructors.userId": userId }
    ]
  };
};

export const deleteAllLessons = async (
  course: ICourseHydratedDocument,
  ctx: MainContextType,
) => {
  const allLessonsWithMedia = await LessonModel.find(
    {
      orgId: ctx.domainData.domainObj.orgId,
      courseId: course._id,
      media: { $ne: null },
    },
    {
      media: 1,
    },
  );
  for (let l of allLessonsWithMedia) {
    if (l.media) {
      await getStorageProvider(l.media.storageProvider).deleteFile(l.media);
    }
  }
  await LessonModel.deleteMany({
    orgId: ctx.domainData.domainObj.orgId,
    courseId: course._id,
  });
};

export const getCourseOrThrow = async ({
  ctx,
  courseId,
}: {
  ctx: MainContextType,
  courseId?: mongoose.Types.ObjectId | string,
}) => {
  const course = await CourseModel.findOne({
    _id: courseId,
    orgId: ctx.domainData.domainObj.orgId
  });

  if (!course) {
    throw new NotFoundException("Course", courseId);
  }

  if (
    !checkPermission(ctx.user.permissions, [
      UIConstants.permissions.manageAnyCourse,
    ])
  ) {
    const isOwner = course.ownerId.equals(ctx.user._id);
    const isInstructor = checkCourseInstructorPermission(course, ctx.user._id);
    const isAdmin = ctx.user.roles.includes(UIConstants.roles.admin);
    
    if (!isOwner && !isInstructor && !isAdmin) {
      throw new AuthorizationException()
    }
  }

  return course;
};

export const syncCourseLessons = async ({
  ctx,
  course,
}: {
  ctx: MainContextType;
  course: ICourseHydratedDocument,
}) => {
  const existingLessons = await LessonModel.find({
    orgId: ctx.domainData.domainObj.orgId,
    courseId: course._id,
  });
  const existingLessonIds = existingLessons.map(lesson => lesson._id);
  for (const chapter of course.chapters) {
    // Remove lesson IDs that no longer exist
    chapter.lessonOrderIds = chapter.lessonOrderIds.filter(id =>
      existingLessonIds.some(lessonId => lessonId.equals(id))
    );
  }
  await course.save();
  return course;
};

export const checkEnrollmentAccess = async ({
  ctx,
  courseId,
}: {
  ctx: MainContextType;
  courseId: mongoose.Types.ObjectId | string;
}) => {
  if (!ctx.session?.user) {
    throw new AuthenticationException();
  }

  const enrollment = await EnrollmentModel.findOne({
    userId: ctx.session.user.id,
    courseId,
    orgId: ctx.domainData.domainObj.orgId,
  });

  if (!enrollment || enrollment.status !== EnrollmentStatusEnum.ACTIVE) {
    if (!checkPermission(ctx.session.user.permissions, [
      UIConstants.permissions.manageCourse,
      UIConstants.permissions.manageAnyCourse,
    ])) {
      throw new AuthorizationException();
    }
  }

  return enrollment;
};
