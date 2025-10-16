"use client";

import { CourseCard, CourseSkeletonCard } from "@/components/course/course-card";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { CreateButton } from "@/components/dashboard/layout/create-button";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseLevelEnum, CourseStatusEnum } from "@workspace/common-logic/models/lms/course.types";
import { useDialogControl } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Grid3x3, List } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CourseCreateDialog } from "./_components/course-create-dialog";

type CourseItemType = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["list"]["items"][number];

type QueryParams = Parameters<typeof trpc.lmsModule.courseModule.course.list.useQuery>[0];


export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const createCourseDialog = useDialogControl();
  const breadcrumbs = [{ label: t("common:dashboard.courses.title"), href: "#" }];

  const [levelFilter, setLevelFilter] = useState<CourseLevelEnum | "all">("all");
  const [courseStatusFilter, setCourseStatusFilter] = useState<CourseStatusEnum | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [parsedData, setParsedData] = useState<CourseItemType[]>([]);
  const [parsedPagination, setParsedPagination] = useState({ pageCount: 1 });

  // Dummy columns for pagination setup
  const columns = useMemo<ColumnDef<CourseItemType>[]>(() => [
    { accessorKey: "_id", header: "ID" },
  ], []);

  const { table } = useDataTable({
    columns,
    data: parsedData,
    pageCount: parsedPagination.pageCount,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 9 },
    },
  });

  const tableState = table.getState();
  const queryParams = useMemo<QueryParams>(() => ({
    pagination: {
      skip: tableState.pagination.pageIndex * tableState.pagination.pageSize,
      take: tableState.pagination.pageSize,
    },
    filter: {
      level: levelFilter === "all" ? undefined : levelFilter,
      status: courseStatusFilter === "all" ? undefined : courseStatusFilter,
    },
  }), [tableState.pagination, levelFilter, courseStatusFilter]);

  const listQuery = trpc.lmsModule.courseModule.course.list.useQuery(queryParams);

  useEffect(() => {
    if (!listQuery.data) return;
    setParsedData(listQuery.data.items || []);
    setParsedPagination({
      pageCount: Math.ceil((listQuery.data.total || 0) / listQuery.data.meta.take),
    });
  }, [listQuery.data]);

  const courses = parsedData;


  return (
    <DashboardContent
      breadcrumbs={breadcrumbs}
      permissions={[UIConstants.permissions.manageAnyCourse, UIConstants.permissions.manageCourse]}
    >
      <HeaderTopbar
        header={{
          title: t("lms.modules.courses.title"),
          subtitle: t("lms.modules.courses.description"),
        }}
        rightAction={<CreateButton onClick={() => createCourseDialog.show()} />}
      />
      <CourseCreateDialog control={createCourseDialog} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Level</Label>
            <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as CourseLevelEnum | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {[CourseLevelEnum.BEGINNER, CourseLevelEnum.INTERMEDIATE, CourseLevelEnum.ADVANCED].map(
                  (level) => (
                    <SelectItem value={level} key={level}>
                      {level === CourseLevelEnum.BEGINNER
                        ? t("courses.status.beginner")
                        : level === CourseLevelEnum.INTERMEDIATE
                          ? t("courses.status.intermediate")
                          : t("courses.status.advanced")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={courseStatusFilter} onValueChange={(value) => setCourseStatusFilter(value as CourseStatusEnum | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {[CourseStatusEnum.IN_PROGRESS, CourseStatusEnum.UNDER_REVIEW, CourseStatusEnum.APPROVED].map(
                  (status) => (
                    <SelectItem value={status} key={status}>
                      {status === CourseStatusEnum.IN_PROGRESS
                        ? t("courses.status.in_progress")
                        : status === CourseStatusEnum.UNDER_REVIEW
                          ? t("courses.status.under_review")
                          : t("courses.status.approved")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className={viewMode === "grid"
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "flex flex-col gap-4"
      }>
        {listQuery.isLoading ? (
          <>
            {[...Array(6)].map((_, index) => (
              <CourseSkeletonCard key={index} />
            ))}
          </>
        ) : courses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-lg">No courses found</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or create a new course</p>
          </div>
        ) : (
          <>
            {courses.map((course, index) => (
              <Link key={index} href={`/dashboard/lms/courses/${course._id}`}>
                <CourseCard course={course} viewMode={viewMode as "grid" | "list"} />
              </Link>
            ))}
          </>
        )}
      </div>

      {!listQuery.isLoading && (
        <DataTablePagination table={table} pageSizeOptions={[9, 18, 27, 36]} />
      )}
    </DashboardContent>
  );
}
