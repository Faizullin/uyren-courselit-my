"use client";

import { useCourseDetail } from "@/components/course/detail/course-detail-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { router } from "@/server/api/core/trpc";
import { trpc } from "@/utils/trpc";
import { ApprovalStatusEnum } from "@workspace/common-logic/lib/approval_status";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { truncate } from "@workspace/utils";
import {
  BookOpen,
  ChevronDown,
  Eye,
  Settings,
  UserPlus,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Page() {
  const router = useRouter();
  const { t } = useTranslation(["course", "dashboard", "common"]);
  const [timeRange, setTimeRange] = useState("7d");
  const { initialCourse, currentLessonId } = useCourseDetail();

  const breadcrumbs = useMemo(() => {
    const breadcrumbs =[
      { label: t("course:list.breadcrumb"), href: "/dashboard/lms/courses" },
      {
        label: initialCourse ? truncate(initialCourse.title, 20) || "..." : "...",
        href: "#",
      },
    ];
    if (currentLessonId) {
      breadcrumbs.push({
        label: truncate(initialCourse.chapters.find((chapter) => chapter._id === currentLessonId)?.title || "", 20) || "...",
        href: `/dashboard/lms/courses/${initialCourse._id}/lessons/${currentLessonId}`,
      });
    }
    return breadcrumbs;
  }, [initialCourse, currentLessonId, t]);

  // const { data: salesData, loading: salesLoading } = useActivities(
  //   ActivityTypeEnum.ENROLLED,
  //   timeRange,
  //   course?._id,
  //   true,
  // );

  const loadCohortsQuery = trpc.lmsModule.cohortModule.cohort.list.useQuery({
    pagination: { skip: 0, take: 5 },
    filter: { courseId: initialCourse._id },
  }, {
    enabled: !!initialCourse._id,
  });

  const enrollmentRequestStatsQuery = trpc.lmsModule.enrollmentRequest.stats.useQuery({
    courseId: initialCourse._id,
  }, {
    enabled: !!initialCourse._id,
  });

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      {!initialCourse.published && (
        <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
          {t("course:detail.draft_notice")}{" "}
          <Link
            href={`/dashboard/lms/courses/${initialCourse._id}/manage#publish`}
            className="underline"
          >
            {t("course:detail.manage_link")}
          </Link>
        </div>
      )}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-semibold flex items-center gap-2">
              {initialCourse.title}
            </h1>
            <div className="flex items-center gap-2">
              {initialCourse ? (
                <>
                  <Badge variant="secondary">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {t("course:detail.badge_course")}
                  </Badge>
                  <Badge variant="outline">
                    {initialCourse.published ? t("course:status.published") : t("course:status.draft")}
                  </Badge>
                </>
              ) : (
                <Skeleton className="h-5 w-48" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={timeRange} onValueChange={setTimeRange} >
              <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder={t("course:detail.select_time_range")} />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/lms/courses/${initialCourse._id}/content`}>
                {t("course:detail.edit_content")}
              </Link>
            </Button>
            <DropdownMenu >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("course:detail.actions")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/courses/${initialCourse._id}/manage`}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("course:detail.manage_course")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/courses/${initialCourse._id}/cohorts`}>
                    <Users className="mr-2 h-4 w-4" />
                    {t("course:detail.cohort_groups")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/courses/${initialCourse._id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t("course:detail.preview_course")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Sales"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          type={ActivityTypeEnum.PURCHASED}
          duration={timeRange}
          entityId={course._id}
        />

        <Link href={`/dashboard/lms/courses/${course._id}/cohorts`}>
          <MetricCard
            title="Cohort Groups"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            type={ActivityTypeEnum.ENROLLED}
            duration={timeRange}
            entityId={course._id}
          />
        </Link> 
        <MetricCard
          title="People who completed the course"
          icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
          type={ActivityTypeEnum.COURSE_COMPLETED}
          duration={timeRange}
          entityId={course._id}
        />
      </div> */}

      {/* <SalesCard data={salesData} loading={salesLoading} /> */}

      {enrollmentRequestStatsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Card 
        className="mt-6 cursor-pointer hover:bg-accent/50 transition-colors" 
        onClick={() => {
           router.push(`/dashboard/lms/courses/${initialCourse._id}/requests?filter[status]=${ApprovalStatusEnum.PENDING}`);
        }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {t("course:requests.title")}
              </div>
              <Badge variant="default">{enrollmentRequestStatsQuery.data?.pending}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("course:requests.pending_desc", { count: enrollmentRequestStatsQuery.data?.pending })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("course:detail.cohort_groups")}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/lms/courses/${initialCourse._id}/cohorts`}>
              {t("common:view_all")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadCohortsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : loadCohortsQuery.data?.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("course:detail.no_cohorts_yet")}{" "}
              <Link href={`/dashboard/lms/courses/${initialCourse._id}/cohorts`} className="text-primary hover:underline">
                {t("course:detail.create_one")}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {loadCohortsQuery.data?.items.map((cohort) => (
                <Link
                  key={cohort._id}
                  href={`/dashboard/lms/cohorts/${cohort._id}`}
                  target="_blank"
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{cohort.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {cohort.instructor?.fullName || t("course:detail.no_instructor")}
                      </div>
                    </div>
                    <Badge variant="secondary">{cohort.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardContent>
  );
}


const TIME_RANGES = [
  { label: "1d", value: "1d" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];