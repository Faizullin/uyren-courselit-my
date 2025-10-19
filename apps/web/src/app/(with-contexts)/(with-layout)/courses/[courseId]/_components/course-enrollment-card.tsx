"use client";

import { useProfile } from "@/components/contexts/profile-context";
import { trpc } from "@/utils/trpc";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { useToast } from "@workspace/components-library";
import { formatCurrency, checkPermission } from "@workspace/utils";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { PaymentPlanTypeEnum } from "@workspace/common-logic/models/payment/payment-plan.types";
import {
  BookOpen,
  BookText,
  GraduationCap,
  Pencil,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GeneralRouterOutputs } from "@/server/api/types";

interface CourseEnrollmentCardProps {
  course: GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["publicGetByIdDetailed"];
  readOnlyMode?: boolean;
}

export default function CourseEnrollmentCard({
  course,
  readOnlyMode = false,
}: CourseEnrollmentCardProps) {
  const { t } = useTranslation("common");
  const { profile } = useProfile();
  const router = useRouter();
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  // Get enrollment details if enrolled
  const { data: membershipData } = trpc.lmsModule.enrollment.getMembership.useQuery(
    { courseId: course._id },
    { enabled: !!profile?.id && !!course._id }
  );

  // Enroll mutation for free courses
  const enrollMutation = trpc.lmsModule.enrollment.enrollCourse.useMutation({
    onSuccess: () => {
      if (!course) return null;
      toast({
        title: t("enrollment_success") || "Successfully enrolled!",
        description: t("enrollment_success_desc") || "You can now access all course content.",
      });
      trpcUtils.lmsModule.enrollment.getMembership.invalidate({ courseId: course._id });
      
      // Navigate to first lesson
      setTimeout(() => {
        if (course.chapters?.[0]?.lessons?.[0]) {
          router.push(`/dashboard/sudent/courses/${course._id}/`);
        }
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: t("enrollment_failed") || "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isInstructor = useMemo(() => {
    if (!profile?.id) return false;
    return String(course?.ownerId) === String(profile.id) || 
           checkPermission(profile.permissions, [UIConstants.permissions.manageAnyCourse]);
  }, [profile, course?.ownerId]);

  // Find default payment plan
  const defaultPaymentPlan = useMemo(() => {
    if (!course?.paymentPlans?.length) return null;
    return course?.paymentPlans.find((p) => String(p._id) === String(course?.defaultPaymentPlanId)) 
           || course?.paymentPlans[0];
  }, [course?.paymentPlans, course?.defaultPaymentPlanId]);

  const isEnrolled = membershipData?.hasMembership;
  const progress = membershipData?.enrollment?.progress || 0;

  const handleEnroll = () => {
    if (!profile?.id) {
      toast({
        title: t("login_required") || "Login required",
        description: t("login_required_enroll") || "Please log in to enroll in this course.",
      });
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }, 500);
      return;
    }

    enrollMutation.mutate({
      data: { courseId: course._id },
    });
  };

  // Simple price display
  const getPriceDisplay = () => {
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
  };

  return (
    <Card className="border-2 rounded-md">
      
      <CardContent className="p-5">
        {/* Price Display - if has payment plan */}
        {defaultPaymentPlan && defaultPaymentPlan.type !== PaymentPlanTypeEnum.FREE && (
          <div className="text-2xl font-semibold mb-3 text-brand-primary">
            {getPriceDisplay()}
          </div>
        )}

        {/* Action Buttons */}
        {!readOnlyMode && (
          <div className="space-y-2 mb-6">
            {isEnrolled ? (
              /* Enrolled - Continue Learning */
              <Link
                href={
                  course?.chapters?.[0]?.lessons?.[0]?._id
                    ? `/courses/${course._id}/lessons/${course?.chapters[0].lessons[0]._id}`
                    : `/courses/${course._id}`
                }
              >
                <Button variant="default" size="default" className="w-full">
                  <BookText className="h-4 w-4 mr-2" />
                  {t("continue_learning") || "Continue Learning"}
                </Button>
              </Link>
            ) : (
              /* Not Enrolled */
              <>
                {defaultPaymentPlan?.type === PaymentPlanTypeEnum.FREE ? (
                  /* Free Course - Enroll Button */
                  !isInstructor && (
                    <Button
                      variant="default"
                      size="default"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending}
                    >
                      <BookText className="h-4 w-4 mr-2" />
                      {enrollMutation.isPending 
                        ? (t("enrolling") || "Enrolling...") 
                        : (t("start_learning") || "Start Learning")}
                    </Button>
                  )
                ) : defaultPaymentPlan ? (
                  /* Paid Course - Show Price Button (disabled - payment not implemented) */
                  <Button
                    variant="default"
                    size="default"
                    className="w-full"
                    disabled
                  >
                    {t("buy_for") || "Buy for"} {getPriceDisplay()}
                  </Button>
                ) : (
                  /* No Payment Plan - Default free enroll */
                  !isInstructor && (
                    <Button
                      variant="default"
                      size="default"
                      className="w-full"
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending}
                    >
                      <BookText className="h-4 w-4 mr-2" />
                      {enrollMutation.isPending 
                        ? (t("enrolling") || "Enrolling...") 
                        : (t("start_learning") || "Start Learning")}
                    </Button>
                  )
                )}
              </>
            )}

            {/* Instructor Actions */}
            {isInstructor && (
              <>                
                <Link href={`/dashboard/lms/courses/${course._id}/`}>
                  <Button variant="outline" size="default" className="w-full">
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("edit")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}

        {/* Course Stats */}
        <div className="space-y-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {t("course_includes") || "This course includes:"}
          </div>

          {/* Lessons Count */}
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <BookOpen className="h-4 w-4 stroke-1.5" />
            <span className="ml-2">
              {course?.statsLessonCount} {t("lessons") || "Lessons"}
            </span>
          </div>

          {/* Rating */}
          {course?.statsAverageRating && (
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <Star className="h-4 w-4 stroke-1.5 fill-yellow-500 text-transparent" />
              <span className="ml-2">
                {course.statsAverageRating} {t("rating") || "Rating"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
