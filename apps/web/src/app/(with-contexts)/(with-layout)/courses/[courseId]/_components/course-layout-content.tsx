"use client";

import { useProfile } from "@/components/contexts/profile-context";
import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { trpc } from "@/utils/trpc";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { checkPermission, formatCurrency } from "@workspace/utils";
import { BookOpen, BookText, ClipboardCheck, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import CourseLessonsSidebar from "./course-lessons-sidebar";
import { TRPCError } from "@trpc/server";

interface CourseLayoutContentProps {
  courseData: {
    _id: string;
    title: string;
  };
  showEnrollmentCard?: boolean;
}

export default function CourseLayoutContent({
  showEnrollmentCard = true 
}: CourseLayoutContentProps) {
  const { t } = useTranslation("course");
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  const { loadCoursePublicDetailedQuery, initialCourse } = useCoursePublicDetail();

  const courseDetailedData = loadCoursePublicDetailedQuery.data;

  const loadMembershipQuery = trpc.lmsModule.enrollment.getMembership.useQuery(
    { courseId: initialCourse._id },
    { enabled: !!profile?.id && !!initialCourse._id }
  );

  const selfEnrollMutation = trpc.lmsModule.enrollment.selfEnrollCourse.useMutation({
    onSuccess: () => {
      toast({
        title: t("enrollment.success"),
        description: t("enrollment.success_desc"),
      });
      trpcUtils.lmsModule.enrollment.getMembership.invalidate({ courseId: initialCourse._id });
      trpcUtils.lmsModule.courseModule.course.publicGetByIdDetailed.invalidate({ id: initialCourse._id });
      setTimeout(() => {
        const firstLesson = courseDetailedData?.chapters?.[0]?.lessons?.[0];
        if (firstLesson) {
          router.push(`/dashboard/student/courses/${initialCourse._id}/lessons/${firstLesson._id}`);
        }
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: t("errors.enrollment_failed"),
        description: error.message || t("errors.generic"),
        variant: "destructive",
      });
    },
  });

  const requestEnrollMutation = trpc.lmsModule.enrollment.requestEnrollment.useMutation({
    onSuccess: () => {
      toast({
        title: t("enrollment.request_success"),
        description: t("enrollment.request_success_desc"),
      });
      trpcUtils.lmsModule.enrollment.getMembership.invalidate({ courseId: initialCourse._id });
    },
    onError: (error) => {
      toast({
        title: t("errors.request_failed"),
        description: error.message || t("errors.generic"),
        variant: "destructive",
      });
    },
  });

  const isInstructor = useMemo(() => {
    if (!profile?.id || !loadCoursePublicDetailedQuery.data) return false;
    return loadCoursePublicDetailedQuery.data.owner._id === profile.id || 
           checkPermission(profile.permissions, [UIConstants.permissions.manageAnyCourse]);
  }, [profile, loadCoursePublicDetailedQuery.data]);

  const defaultPaymentPlan = useMemo(() => {
    const paymentPlans = courseDetailedData?.paymentPlans;
    const defaultPaymentPlanId = courseDetailedData?.defaultPaymentPlanId;
    if (!paymentPlans?.length) return null;
    return paymentPlans.find((p) => p._id === defaultPaymentPlanId) 
           || paymentPlans[0];
  }, [courseDetailedData?.paymentPlans, courseDetailedData?.defaultPaymentPlanId]);

  const isEnrolled = loadMembershipQuery.data?.hasMembership;
  const progress = loadMembershipQuery.data?.enrollment?.progress || 0;
  const cohort = loadMembershipQuery.data?.enrollment?.cohort;

  const handleSelfEnroll = useCallback(() => {
    if (!profile?.id) {
      toast({
        title: t("enrollment.login_required"),
        description: t("enrollment.login_required_desc"),
      });
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }, 500);
      return;
    }
    selfEnrollMutation.mutate({ data: { courseId: initialCourse._id } });
  }, [profile?.id, toast, t, router, pathname, selfEnrollMutation, initialCourse._id]);

  const handleRequestEnroll = useCallback(() => {
    if (!profile?.id) {
      toast({
        title: t("enrollment.login_required"),
        description: t("enrollment.login_required_desc"),
      });
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }, 500);
      return;
    }
    requestEnrollMutation.mutate({ data: { courseId: initialCourse._id } });
  }, [profile?.id, toast, t, router, pathname, requestEnrollMutation, initialCourse._id]);

  const getPriceDisplay = useCallback(() => {
    if (!defaultPaymentPlan) return null;
    const plan = defaultPaymentPlan;
    if (plan.type === PaymentPlanTypeEnum.FREE) return null;
    if (plan.type === PaymentPlanTypeEnum.SUBSCRIPTION) {
      return formatCurrency(plan.subscriptionMonthlyAmount || 0, plan.currency);
    }
    if (plan.type === PaymentPlanTypeEnum.EMI) {
      return formatCurrency(plan.emiAmount || 0, plan.currency);
    }
    return formatCurrency(plan.oneTimeAmount || 0, plan.currency);
  }, [defaultPaymentPlan]);

  const isLessonPage = pathname.includes('/lessons/');

  if (!courseDetailedData) return null;

  return (
    <div className="space-y-6 m--course-sidebar">
      {showEnrollmentCard && !isLessonPage && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            {defaultPaymentPlan && defaultPaymentPlan.type !== PaymentPlanTypeEnum.FREE && (
              <div className="text-2xl font-semibold mb-3 text-brand-primary">
                {getPriceDisplay()}
              </div>
            )}

            <div className="space-y-2 mb-5">
              {isEnrolled ? (
                <Link
                  href={
                    courseDetailedData.chapters?.[0]?.lessons?.[0]?._id 
                      ? `/dashboard/student/courses/${initialCourse._id}/lessons/${courseDetailedData.chapters[0].lessons[0]._id}`
                      : `/dashboard/student/courses/${initialCourse._id}`
                  }
                >
                  <Button variant="default" size="default" className="w-full">
                    <BookText className="h-4 w-4 mr-2" />
                    {t("public.continue_learning")}
                  </Button>
                </Link>
              ) : (
                <>
                  {defaultPaymentPlan?.type === PaymentPlanTypeEnum.FREE ? (
                    !isInstructor && (
                      courseDetailedData?.allowSelfEnrollment ? (
                        <Button
                          variant="default"
                          size="default"
                          className="w-full"
                          onClick={handleSelfEnroll}
                          disabled={selfEnrollMutation.isPending}
                        >
                          <BookText className="h-4 w-4 mr-2" />
                          {selfEnrollMutation.isPending 
                            ? t("public.enrolling") 
                            : t("public.start_learning")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="default"
                          className="w-full"
                          onClick={handleRequestEnroll}
                          disabled={requestEnrollMutation.isPending}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          {requestEnrollMutation.isPending 
                            ? t("public.requesting") 
                            : t("public.request_enrollment")}
                        </Button>
                      )
                    )
                  ) : defaultPaymentPlan ? (
                    <Button variant="default" size="default" className="w-full" disabled>
                      {t("public.buy_for")} {getPriceDisplay()}
                    </Button>
                  ) : (
                    !isInstructor && (
                      courseDetailedData?.allowSelfEnrollment ? (
                        <Button
                          variant="default"
                          size="default"
                          className="w-full"
                          onClick={handleSelfEnroll}
                          disabled={selfEnrollMutation.isPending}
                        >
                          <BookText className="h-4 w-4 mr-2" />
                          {selfEnrollMutation.isPending 
                            ? t("public.enrolling") 
                            : t("public.start_learning")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="default"
                          className="w-full"
                          onClick={handleRequestEnroll}
                          disabled={requestEnrollMutation.isPending}
                        >
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          {requestEnrollMutation.isPending 
                            ? t("public.requesting") 
                            : t("public.request_enrollment")}
                        </Button>
                      )
                    )
                  )}
                </>
              )}

              {isInstructor && (
                <Link href={`/dashboard/lms/courses/${initialCourse._id}/`}>
                  <Button variant="outline" size="default" className="w-full">
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("public.edit")}
                  </Button>
                </Link>
              )}
            </div>

            {isEnrolled && (
              <>
                {/* Cohort Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                  {cohort ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Cohort</span>
                        <span className="text-xs font-semibold text-foreground">{cohort.title}</span>
                      </div>
                      {cohort.beginDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Started</span>
                          <span className="text-xs text-foreground">
                            {new Date(cohort.beginDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {cohort.maxCapacity && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Capacity</span>
                          <span className="text-xs text-foreground">{cohort.maxCapacity}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <span className="text-xs text-muted-foreground">No cohort assigned</span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progress}% completed</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </>
            )}

            {/* Course Stats */}
            {!isEnrolled && (
              <div className="space-y-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100">{t("public.course_includes")}</div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <BookOpen className="h-4 w-4 stroke-1.5" /> 
                  <span className="ml-2">
                    {courseDetailedData.statsLessonCount} {t("public.lessons")}
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      <CourseLessonsSidebar />
    </div>
  );
} 