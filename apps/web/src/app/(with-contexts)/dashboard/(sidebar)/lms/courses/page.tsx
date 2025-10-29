"use client";

import { CourseCard, CourseSkeletonCard } from "@/components/course/course-card";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { CreateButton } from "@/components/dashboard/layout/create-button";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseLevelEnum, CourseStatusEnum } from "@workspace/common-logic/models/lms/course.types";
import { DataTablePagination, useDataTable, useDialogControl } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Grid3x3, List, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CourseCreateDialog } from "./_components/course-create-dialog";
import { useQueryStates, parseAsString, parseAsBoolean } from "nuqs";
import { useSiteInfo } from "@/components/contexts/site-info-context";

type CourseItemType = GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["list"]["items"][number];

type QueryParams = Parameters<typeof trpc.lmsModule.courseModule.course.list.useQuery>[0];


export default function Page() {
  const { t } = useTranslation(["course", "dashboard", "common"]);
  const { siteInfo } = useSiteInfo();
  const router = useRouter();
  const createCourseDialog = useDialogControl();

  const [filters, setFilters] = useQueryStates({
    "filters[level]": parseAsString.withDefault("all"),
    "filters[status]": parseAsString.withDefault("all"),
    "filters[published]": parseAsBoolean,
  }, {
    history: "replace",
    shallow: true,
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [parsedData, setParsedData] = useState<CourseItemType[]>([]);
  const [parsedPagination, setParsedPagination] = useState({ pageCount: 1 });

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
      level: filters["filters[level]"] === "all" ? undefined : (filters["filters[level]"] as CourseLevelEnum),
      status: filters["filters[status]"] === "all" ? undefined : (filters["filters[status]"] as CourseStatusEnum),
      published: filters["filters[published]"] ?? undefined,
    },
  }), [tableState.pagination, filters]);

  const loadListQuery = trpc.lmsModule.courseModule.course.list.useQuery(queryParams);

  useEffect(() => {
    if (!loadListQuery.data) return;
    setParsedData(loadListQuery.data.items || []);
    setParsedPagination({
      pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
    });
  }, [loadListQuery.data]);


  return (
    <DashboardContent
      breadcrumbs={[{ label: t("course:list.breadcrumb"), href: "#" }]}
      permissions={[ UIConstants.permissions.manageCourse]}
    >
      <HeaderTopbar
        header={{
          title: t("dashboard:lms.modules.courses.title"),
          subtitle: t("dashboard:lms.modules.courses.description"),
        }}
        rightAction={
          <div className="flex gap-2">
            {
              siteInfo.aiHelper.enabled && (
                <Button variant="outline" onClick={() => router.push("/dashboard/lms/courses/ai-generator")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Generator
                </Button>
              )
            }
            <CreateButton onClick={() => createCourseDialog.show()} />
          </div>
        }
      />
      <CourseCreateDialog control={createCourseDialog} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("course:list.filter_level")}</Label>
            <Select 
              value={filters["filters[level]"]} 
              onValueChange={(value) => setFilters({ "filters[level]": value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("course:list.all_levels")}</SelectItem>
                {[CourseLevelEnum.BEGINNER, CourseLevelEnum.INTERMEDIATE, CourseLevelEnum.ADVANCED].map(
                  (level) => (
                    <SelectItem value={level} key={level}>
                      {level === CourseLevelEnum.BEGINNER
                        ? t("course:level.beginner")
                        : level === CourseLevelEnum.INTERMEDIATE
                          ? t("course:level.intermediate")
                          : t("course:level.advanced")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("course:list.filter_status")}</Label>
            <Select 
              value={filters["filters[status]"]} 
              onValueChange={(value) => setFilters({ "filters[status]": value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("course:list.all_statuses")}</SelectItem>
                {[CourseStatusEnum.IN_PROGRESS, CourseStatusEnum.UNDER_REVIEW, CourseStatusEnum.APPROVED].map(
                  (status) => (
                    <SelectItem value={status} key={status}>
                      {status === CourseStatusEnum.IN_PROGRESS
                        ? t("course:status.in_progress")
                        : status === CourseStatusEnum.UNDER_REVIEW
                          ? t("course:status.under_review")
                          : t("course:status.approved")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("course:list.filter_published")}</Label>
            <Select 
              value={filters["filters[published]"] === null ? "all" : filters["filters[published]"].toString()} 
              onValueChange={(value) => setFilters({ 
                "filters[published]": value === "all" ? null : value === "true" 
              })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common:not_selected")}</SelectItem>
                <SelectItem value="true">{t("course:status.published")}</SelectItem>
                <SelectItem value="false">{t("course:status.unpublished")}</SelectItem>
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
        {loadListQuery.isLoading ? (
          <>
            {[...Array(6)].map((_, index) => (
              <CourseSkeletonCard key={index} />
            ))}
          </>
        ) : loadListQuery.data?.items?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-lg">{t("course:list.no_courses")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("course:list.no_courses_desc")}</p>
          </div>
        ) : (
          <>
            {loadListQuery.data?.items?.map((course, index) => (
              <Link key={index} href={`/dashboard/lms/courses/${course._id}`}>
                <CourseCard course={course} viewMode={viewMode} />
              </Link>
            ))}
          </>
        )}
      </div>

      {!loadListQuery.isLoading && (
        <DataTablePagination table={table} pageSizeOptions={[9, 18, 27, 36]} />
      )}
    </DashboardContent>
  );
}
