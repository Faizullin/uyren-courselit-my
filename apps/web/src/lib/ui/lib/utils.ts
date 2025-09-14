import { cleanHost, getBackendAddress } from "@/server/lib/domain-utils";
import type {
  CommunityMemberStatus,
  CommunityReportStatus,
  Course,
  Group,
  Membership,
  MembershipRole,
  PaymentPlan,
  Profile,
} from "@workspace/common-models";
import { Constants, UIConstants } from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import { createHash, randomInt } from "crypto";
const { permissions } = UIConstants;

export const formattedLocaleDate = (
  epochString?: Date | number | string,
  monthFormat?: "short" | "long",
) => {
  if (epochString) {
    return new Date(Number(epochString)).toLocaleString("en-US", {
      year: "numeric",
      month: monthFormat || "short",
      day: "numeric",
    });
  }
  return "";
};

export const formulateCourseUrl = (course: any, backend = "") =>
  `${backend}/${course.isBlog ? "post" : "course"}/${course.courseId}/${
    course.slug
  }`;

export const getAddress = (host: string) => {
  return {
    domain: cleanHost(host) || host,
    backend: host,
    frontend: `http://${host}`,
  };
};

export const canAccessDashboard = (profile: Profile) => {
  return checkPermission(profile.permissions, [
    permissions.manageCourse,
    permissions.manageAnyCourse,
    permissions.manageSite,
    permissions.manageSettings,
    permissions.manageUsers,
  ]);
};

export const isEnrolled = (courseId: string, profile: Profile) =>
  profile.fetched &&
  profile.purchases.some((purchase: any) => purchase.courseId === courseId);

export const isLessonCompleted = ({
  courseId,
  lessonId,
  profile,
}: {
  courseId: string;
  lessonId: string;
  profile: Profile;
}) => {
  const indexOfCurrentCourse = profile.purchases.findIndex(
    (purchase) => purchase.courseId === courseId,
  );
  if (indexOfCurrentCourse === -1) return false;
  const tmp = profile.purchases[indexOfCurrentCourse];
  if (tmp === undefined) {
    throw new Error("Purchase data is undefined for the current course.");
  }
  return tmp.completedLessons.some((lesson) => lesson === lessonId);
};

const swapMembers = (arr: any[], index1: number, index2: number): any[] => {
  if (index1 < 0 || index1 > arr.length - 1) {
    return arr;
  }
  if (index2 < 0 || index2 > arr.length - 1) {
    return arr;
  }
  [arr[index1], arr[index2]] = [arr[index2], arr[index1]];
  return arr;
};

export const moveMemberUp = (arr: any[], index: number) =>
  swapMembers(arr, index - 1, index);
export const moveMemberDown = (arr: any[], index: number) =>
  swapMembers(arr, index, index + 1);

export function generateUniquePasscode() {
  return randomInt(100000, 999999);
}

// Inspired from: https://github.com/nextauthjs/next-auth/blob/c4ad77b86762b7fd2e6362d8bf26c5953846774a/packages/next-auth/src/core/lib/utils.ts#L16
export function hashCode(code: number) {
  return createHash("sha256")
    .update(`${code}${process.env.AUTH_SECRET}`)
    .digest("hex");
}

export const sortCourseGroups = (course: Course) => {
  if (course.groups === undefined) {
    throw new Error("Course groups are undefined");
  }
  return course.groups.sort((a: Group, b: Group) => a.rank - b.rank);
};

export function getNextStatusForCommunityMember(status: CommunityMemberStatus) {
  const statusCycle = [
    Constants.MembershipStatus.PENDING,
    Constants.MembershipStatus.ACTIVE,
    Constants.MembershipStatus.REJECTED,
  ];
  const index = statusCycle.indexOf(status);
  return statusCycle[(index + 1) % statusCycle.length];
}

export function getNextStatusForCommunityReport(status: CommunityReportStatus) {
  const statusCycle = Object.values(Constants.CommunityReportStatus);
  const index = statusCycle.indexOf(status);
  return statusCycle[(index + 1) % statusCycle.length];
}

export function getNextRoleForCommunityMember(role: MembershipRole) {
  const roleCycle = Object.values(Constants.MembershipRole);
  const index = roleCycle.indexOf(role);
  return roleCycle[(index + 1) % roleCycle.length];
}

export function getPlanPrice(plan: PaymentPlan): {
  amount: number;
  period: string;
} {
  if (!plan) {
    return { amount: 0, period: "" };
  }
  switch (plan.type) {
    case Constants.PaymentPlanType.FREE:
      return { amount: 0, period: "" };
    case Constants.PaymentPlanType.ONE_TIME:
      return { amount: plan.oneTimeAmount || 0, period: "" };
    case Constants.PaymentPlanType.SUBSCRIPTION:
      if (plan.subscriptionYearlyAmount) {
        return {
          amount: plan.subscriptionYearlyAmount,
          period: "/yr",
        };
      }
      return {
        amount: plan.subscriptionMonthlyAmount || 0,
        period: "/mo",
      };
    case Constants.PaymentPlanType.EMI:
      return {
        amount: plan.emiAmount || 0,
        period: "/mo",
      };
    default:
      return { amount: 0, period: "" };
  }
}

export function hasCommunityPermission(
  member: Pick<Membership, "role">,
  requiredRole: MembershipRole,
): boolean {
  const roleHierarchy = [
    Constants.MembershipRole.COMMENT,
    Constants.MembershipRole.POST,
    Constants.MembershipRole.MODERATE,
  ];
  const memberRoleIndex = roleHierarchy.indexOf(
    member.role.toLowerCase() as MembershipRole,
  );
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return memberRoleIndex >= requiredRoleIndex;
}

export async function getAddressFromHeaders(headers: any) {
  const headersList = await headers();
  const address = getBackendAddress({
    "x-forwarded-proto": headersList.get("x-forwarded-proto"),
    host: headersList.get("host"),
  });
  return address;
}
