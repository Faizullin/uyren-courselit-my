"use client";

import { CohortCreateNiceDialog } from "@/components/course/cohort-create-nice-dialog";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { CreateButton } from "@/components/dashboard/layout/create-button";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import { DeleteConfirmNiceDialog, NiceModal } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Archive, Edit, Eye, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCourseContext } from "../_components/course-context";
import { NotSupportedException } from "@/server/api/core/exceptions";

type ItemType = GeneralRouterOutputs["lmsModule"]["cohortModule"]["cohort"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.lmsModule.cohortModule.cohort.list.useQuery>[0];

export default function CourseCohorts() {
  throw new NotSupportedException("Cohorts are not supported yet");
  const { course, isLoading: courseLoading } = useCourseContext();
  const courseId = course?._id;
  
  const [parsedData, setParsedData] = useState<ItemType[]>([]);
  const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CohortStatusEnum | "all">("all");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const deleteMutation = trpc.lmsModule.cohortModule.cohort.delete.useMutation({
    onSuccess: () => {
      loadListQuery.refetch();
    },
  });

  const handleDelete = useCallback(async (cohort: ItemType) => {
    const result = await NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Delete Cohort",
      message: `Are you sure you want to delete "${cohort.title}"?`,
    });
    
    if (result.reason === "confirm") {
      deleteMutation.mutate({ id: cohort._id });
    }
  }, [deleteMutation]);

  const getStatusBadge = useCallback((status: CohortStatusEnum) => {
    const variants: Record<CohortStatusEnum, "default" | "secondary" | "destructive" | "outline"> = {
      [CohortStatusEnum.UPCOMING]: "secondary",
      [CohortStatusEnum.LIVE]: "default",
      [CohortStatusEnum.COMPLETED]: "outline",
      [CohortStatusEnum.CANCELLED]: "destructive",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  }, []);

  const columns: ColumnDef<ItemType>[] = useMemo(() => {
    return [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link href={`/dashboard/lms/cohorts/${row.original._id}`} className="font-medium">{row.getValue("title")}</Link>
        ),
      },
      {
        accessorKey: "instructor",
        header: "Instructor",
        cell: ({ row }) => {
          const instructor = row.original.instructor;
          return <div>{instructor?.fullName || "-"}</div>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
      },
      {
        accessorKey: "beginDate",
        header: "Start Date",
        cell: ({ row }) => {
          const date = row.getValue("beginDate") as Date;
          return date ? format(new Date(date), "MMM dd, yyyy") : "-";
        },
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        cell: ({ row }) => {
          const date = row.getValue("endDate") as Date;
          return date ? format(new Date(date), "MMM dd, yyyy") : "-";
        },
      },
      {
        accessorKey: "maxCapacity",
        header: "Capacity",
        cell: ({ row }) => {
          const maxCap = row.getValue("maxCapacity") as number;
          if (!maxCap) return "Unlimited";
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm">0/{maxCap}</span>
              <div className="h-1 w-16 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "0%" }}></div>
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const cohort = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/cohorts/${cohort._id}`} target="_blank">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/cohorts/${cohort._id}`} target="_blank">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(cohort)} className="text-destructive">
                  <Archive className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [getStatusBadge, handleDelete]);

  const { table } = useDataTable({
    columns,
    data: parsedData,
    pageCount: parsedPagination.pageCount,
    enableGlobalFilter: true,
    initialState: {
      sorting: [{ id: "beginDate", desc: true }],
    },
  });

  const tableState = table.getState();
  const queryParams = useMemo(() => {
    const parsed: QueryParams = {
      pagination: {
        skip: tableState.pagination.pageIndex * tableState.pagination.pageSize,
        take: tableState.pagination.pageSize,
      },
      filter: {
        courseId: courseId,
      },
    };
    if (tableState.sorting[0]) {
      parsed.orderBy = {
        field: tableState.sorting[0].id,
        direction: tableState.sorting[0].desc ? "desc" : "asc",
      };
    }
    if (debouncedSearchQuery) {
      parsed.search = { q: debouncedSearchQuery };
    }
    if (statusFilter !== "all") {
      parsed.filter!.status = statusFilter;
    }
    return parsed;
  }, [tableState.sorting, tableState.pagination, debouncedSearchQuery, statusFilter, courseId]);

  const loadListQuery = trpc.lmsModule.cohortModule.cohort.list.useQuery(queryParams, {
    enabled: !!courseId,
  });

  useEffect(() => {
    if (!loadListQuery.data) return;
    setParsedData(loadListQuery.data.items || []);
    setParsedPagination({
      pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
    });
  }, [loadListQuery.data]);

  const handleCreateCohort = useCallback(async () => {
    if (!courseId) return;
    
    const result = await NiceModal.show(CohortCreateNiceDialog, {
      courseId: courseId,
    });
    
    if (result.reason === "submit") {
      loadListQuery.refetch();
    }
  }, [courseId, loadListQuery]);

  if (courseLoading) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: "Courses", href: "/dashboard/lms/courses" },
          { label: "...", href: "#" },
          { label: "Cohorts", href: "#" },
        ]}
      >
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardContent>
    );
  }

  if (!course) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: "Courses", href: "/dashboard/lms/courses" },
          { label: "Course", href: "#" },
          { label: "Cohorts", href: "#" },
        ]}
      >
        <div className="text-center py-8">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </DashboardContent>
    );
  }

  const cohortCount = loadListQuery.data?.total || 0;

  return (
    <DashboardContent
      breadcrumbs={[
        { label: "Courses", href: "/dashboard/lms/courses" },
        { label: course?.title || "", href: `/dashboard/lms/courses/${courseId}` },
        { label: "Cohorts", href: "#" },
      ]}
    >
      <HeaderTopbar
        backLink={true}
        header={{
          title: "Cohort Groups",
          subtitle: `Manage cohort groups for ${course?.title || ""}`,
        }}
        rightAction={
          <CreateButton onClick={handleCreateCohort} text="Add Cohort" />
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{cohortCount}</div>
            <p className="text-xs text-muted-foreground">Total Cohorts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData.filter(c => c.status === CohortStatusEnum.LIVE).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Cohorts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData.reduce((sum, c) => sum + (c.maxCapacity || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Capacity</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder="Search cohorts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CohortStatusEnum | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(CohortStatusEnum).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DataTable table={table}>
              <DataTableToolbar table={table} />
            </DataTable>
          </div>
        </CardContent>
      </Card>
    </DashboardContent>
  );
}

