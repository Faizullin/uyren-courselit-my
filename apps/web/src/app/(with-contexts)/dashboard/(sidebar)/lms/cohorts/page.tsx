"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { CreateButton } from "@/components/dashboard/layout/create-button";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CohortStatusEnum } from "@workspace/common-logic/models/lms/cohort.types";
import { DeleteConfirmNiceDialog, NiceModal, useDialogControl, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Archive, Edit, Eye, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CohortCreateDialog } from "./_components/cohort-create-dialog";

type ItemType = GeneralRouterOutputs["lmsModule"]["cohortModule"]["cohort"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.lmsModule.cohortModule.cohort.list.useQuery>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const createCohortDialogControl = useDialogControl();
    const trpcUtils = trpc.useUtils();
    const [parsedData, setParsedData] = useState<ItemType[]>([]);
    const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<CohortStatusEnum | "all">("all");
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const breadcrumbs = useMemo(() => [{ label: t("common:dashboard.cohorts.title"), href: "#" }], [t]);

    const statsQuery = trpc.lmsModule.cohortModule.cohort.getStats.useQuery();

    const deleteMutation = trpc.lmsModule.cohortModule.cohort.delete.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Cohort deleted successfully" });
            loadListQuery.refetch();
            statsQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleDelete = useCallback((cohort: ItemType) => {
        NiceModal.show(DeleteConfirmNiceDialog, {
            title: "Delete Cohort",
            message: `Are you sure you want to delete "${cohort.title}"?`,
            data: cohort,
        }).then((result) => {
            if (result.reason === "confirm") {
                deleteMutation.mutate({ id: cohort._id });
            }
        });
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
                header: t("table.title"),
                cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
            },
            {
                accessorKey: "course",
                header: t("courses.course"),
                cell: ({ row }) => {
                    const course = row.original.course;
                    return <div>{course?.title || "-"}</div>;
                },
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
                header: t("table.actions"),
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
                                    <Link href={`/dashboard/lms/cohorts/${cohort._id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t("table.view_details")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/lms/cohorts/${cohort._id}`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t("table.edit")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(cohort)} className="text-red-600">
                                    <Archive className="h-4 w-4 mr-2" />
                                    {t("table.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ];
    }, [t, getStatusBadge, handleDelete]);

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
        if (statusFilter !== "all" || courseFilter !== "all") {
            parsed.filter = {};
            if (statusFilter !== "all") parsed.filter.status = statusFilter;
            if (courseFilter !== "all") parsed.filter.courseId = courseFilter;
        }
        return parsed;
    }, [tableState.sorting, tableState.pagination, debouncedSearchQuery, statusFilter, courseFilter]);

    const loadListQuery = trpc.lmsModule.cohortModule.cohort.list.useQuery(queryParams);

    useEffect(() => {
        if (!loadListQuery.data) return;
        setParsedData(loadListQuery.data.items || []);
        setParsedPagination({
            pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
        });
    }, [loadListQuery.data]);

    const handleCreateSuccess = useCallback(() => {
        loadListQuery.refetch();
        statsQuery.refetch();
    }, [loadListQuery.refetch, statsQuery.refetch]);

    const searchCourses = useCallback(async (search: string, offset: number, size: number) => {
        const result = await trpcUtils.lmsModule.courseModule.course.list.fetch({
            pagination: { skip: offset, take: size },
            search: search ? { q: search } : undefined,
        });
        return result.items.map(course => ({ _id: course._id, title: course.title }));
    }, [trpcUtils]);

    const uniqueCourses = useMemo(() => {
        const coursesMap = new Map();
        parsedData.forEach(cohort => {
            if (cohort.course?.title) {
                coursesMap.set(String(cohort.course.title), cohort.course.title);
            }
        });
        return Array.from(coursesMap.values());
    }, [parsedData]);

    const statistics = useMemo(() => ({
        total: statsQuery.data?.totalCohorts || 0,
        active: statsQuery.data?.activeCohorts || 0,
        completed: statsQuery.data?.completedCohorts || 0,
        totalStudents: statsQuery.data?.totalStudents || 0,
        totalCapacity: statsQuery.data?.totalCapacity || 0,
    }), [statsQuery.data]);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[UIConstants.permissions.manageAnyCourse, UIConstants.permissions.manageCourse]}
        >
            <HeaderTopbar
                header={{
                    title: t("lms.modules.cohorts.title"),
                    subtitle: t("lms.modules.cohorts.description"),
                }}
                rightAction={
                    <CreateButton onClick={() => createCohortDialogControl.show()} text="Add Cohort" />
                }
            />

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{statistics.total}</div>
                        <p className="text-xs text-muted-foreground">Total Cohorts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{statistics.active}</div>
                        <p className="text-xs text-muted-foreground">Active Cohorts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{statistics.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Total Students</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{statistics.totalCapacity}</div>
                        <p className="text-xs text-muted-foreground">Total Capacity</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent>
                    <div className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap gap-4">
                            <Input
                                placeholder={t("table.search_placeholder")}
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
                            <Select value={courseFilter} onValueChange={(value) => setCourseFilter(value)}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by course" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {uniqueCourses.map((course) => (
                                        <SelectItem key={course} value={course}>
                                            {course}
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
            <CohortCreateDialog
                control={createCohortDialogControl}
                onSuccess={handleCreateSuccess}
            />
        </DashboardContent>
    );
}