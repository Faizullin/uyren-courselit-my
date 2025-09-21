import CommunityModel from "@/models/community/Community";
import CourseModel from "@/models/Course";
import MembershipModel from "@/models/Membership";
import UserModel from "@/models/User";
import { Constants } from "@workspace/common-models";
import { NotFoundException } from "../../core/exceptions";
import { assertDomainExist } from "../../core/permissions";
import {
  createDomainRequiredMiddleware,
  protectedProcedure,
} from "../../core/procedures";
import { router } from "../../core/trpc";

const { MembershipStatus, MembershipEntityType } = Constants;

export const userContentRouter = router({
  getProtectedUserContent: protectedProcedure
    .use(createDomainRequiredMiddleware())
    .query(async ({ ctx }) => {
      const domainObj = await assertDomainExist(ctx);
      const user = await UserModel.findOne({
        userId: ctx.user.userId,
        domain: domainObj._id,
      });

      if (!user) {
        throw new NotFoundException("User");
      }

      const memberships = await MembershipModel.find({
        domain: domainObj._id,
        userId: user.userId,
        status: MembershipStatus.ACTIVE,
      });

      const content: Record<string, unknown>[] = [];

      for (const membership of memberships) {
        if (membership.entityType === MembershipEntityType.COURSE) {
          const course = await CourseModel.findOne({
            courseId: membership.entityId,
            domain: domainObj._id,
          });

          if (course) {
            content.push({
              entityType: MembershipEntityType.COURSE,
              entity: {
                id: course.courseId,
                title: course.title,
                slug: course.slug,
                type: course.type,
                totalLessons: course.lessons?.length || 0,
                completedLessonsCount:
                  user.purchases?.find(
                    (progress: any) => progress.courseId === course.courseId,
                  )?.completedLessons?.length || 0,
                featuredImage: course.featuredImage,
              },
            });
          }
        }

        if (membership.entityType === MembershipEntityType.COMMUNITY) {
          const community = await CommunityModel.findOne({
            communityId: membership.entityId,
            domain: domainObj._id,
            deleted: false,
          });

          if (community) {
            content.push({
              entityType: MembershipEntityType.COMMUNITY,
              entity: {
                id: community.communityId,
                title: community.name,
                featuredImage: community.featuredImage,
              },
            });
          }
        }
      }

      return content;
    }),
});
