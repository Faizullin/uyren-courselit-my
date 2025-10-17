"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { useActivities } from "@/hooks/use-activities";
import { ActivityTypeEnum } from "@workspace/common-logic/lib/ui/activity";
import { trpc } from "@/utils/trpc";
import { useToast } from "@workspace/components-library";
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
  DollarSign,
  Eye,
  GraduationCap,
  Settings,
  Users
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import MetricCard from "./_components/metric-card";
import SalesCard from "./_components/sales-card";
import { useCourseContext } from "./_components/course-context";

export default function Page() {
  const [timeRange, setTimeRange] = useState("7d");
  const { toast } = useToast();
  const { course, isLoading: courseLoading } = useCourseContext();

  const breadcrumbs = [
    { label: "Manage Courses", href: "/dashboard/lms/courses" },
    {
      label: course ? truncate(course.title || "", 20) || "..." : "...",
      href: "#",
    },
  ];

  const { data: salesData, loading: salesLoading } = useActivities(
    ActivityTypeEnum.ENROLLED,
    timeRange,
    course?._id,
    true,
  );

  const loadCohortsQuery = trpc.lmsModule.cohortModule.cohort.list.useQuery({
    pagination: { skip: 0, take: 5 },
    filter: { courseId: course?._id },
  }, {
    enabled: !!course?._id,
  });

  if (courseLoading || !course) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      {!course?.published && (
        <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
          {course?.published ? "Published" : "Draft"}{" "}
          <Link
            href={`/dashboard/lms/courses/${course._id}/manage#publish`}
            className="underline"
          >
            Manage
          </Link>
        </div>
      )}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-semibold flex items-center gap-2">
              {course?.title || <Skeleton className="h-9 w-64" />}
            </h1>
            <div className="flex items-center gap-2">
              {course ? (
                <>
                  <Badge variant="secondary">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Course
                  </Badge>
                  <Badge variant="outline">
                    {course.published ? "Published" : "Draft"}
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
                <SelectValue placeholder="Select time range" />
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
              <Link href={`/dashboard/lms/courses/${course._id}/content`}>
                Edit Content
              </Link>
            </Button>
            <DropdownMenu >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/courses/${course._id}/manage`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Course
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/courses/${course._id}/cohorts`}>
                    <Users className="mr-2 h-4 w-4" />
                    Cohort Groups
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/courses/${course._id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Course
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>

      <SalesCard data={salesData} loading={salesLoading} />

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cohort Groups</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/lms/courses/${course._id}/cohorts`}>
              View All
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
              No cohort groups yet.{" "}
              <Link href={`/dashboard/lms/courses/${course._id}/cohorts`} className="text-primary hover:underline">
                Create one
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
                        {cohort.instructor?.fullName || "No instructor"}
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