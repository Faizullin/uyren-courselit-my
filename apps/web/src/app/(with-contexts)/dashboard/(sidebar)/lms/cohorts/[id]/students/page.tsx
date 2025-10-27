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
import { DeleteConfirmNiceDialog, NiceModal, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Trash2, MoreHorizontal, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type ItemType = GeneralRouterOutputs["lmsModule"]["enrollment"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.lmsModule.enrollment.list.useQuery>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const params = useParams<{ id: string }>();
    const cohortId = params.id;
    const trpcUtils = trpc.useUtils();
    const [parsedData, setParsedData] = useState<ItemType[]>([]);
    const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [statusFilter, setStatusFilter] = useState<CohortStatusEnum | "all">("all");
    const cohortQuery = trpc.lmsModule.cohortModule.cohort.getById.useQuery({ id: cohortId }, { enabled: !!cohortId });
    const cohort = cohortQuery.data;

    const breadcrumbs = useMemo(() => [
        { label: t("common:dashboard.cohorts.title"), href: "/dashboard/lms/cohorts" },
        { label: cohort?.title || "Cohort", href: `/dashboard/lms/cohorts/${cohortId}` },
        { label: "Students", href: "#" }
    ], [t, cohort?.title, cohortId]);       

    const unenrollMutation = trpc.lmsModule.enrollment.unenroll.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Student removed successfully" });
            loadListQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleRemoveStudent = useCallback(async (enrollment: ItemType) => {
        const result = await NiceModal.show(DeleteConfirmNiceDialog, {
            title: "Remove Student",
            message: `Are you sure you want to remove "${enrollment.user?.fullName || enrollment.user?.email}" from this cohort?`,
        });
        if (result.reason === "confirm") {
            unenrollMutation.mutate({ id: enrollment._id });
        }
    }, [unenrollMutation]);

    const handleInviteStudents = useCallback(() => {
        toast({ 
            title: "Coming Soon", 
            description: "Invite students functionality will be available soon." 
        });
    }, [toast]);

    const columns: ColumnDef<ItemType>[] = useMemo(() => {
        return [
            {
                accessorKey: "user",
                header: "Student",
                cell: ({ row }) => {
                    const user = row.original.user;
                    return <div className="font-medium">{user?.fullName || user?.email || "-"}</div>;
                },
            },
            {
                accessorKey: "user.email",
                header: "Email",
                cell: ({ row }) => {
                    const user = row.original.user;
                    return <div>{user?.email || "-"}</div>;
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => {
                    const status = row.getValue("status") as string;
                    return <Badge>{status}</Badge>;
                },
            },
            {
                accessorKey: "enrolledAt",
                header: "Enrolled",
                cell: ({ row }) => {
                    const date = row.getValue("enrolledAt") as Date;
                    return date ? format(new Date(date), "MMM dd, yyyy") : "-";
                },
            },
            {
                id: "actions",
                header: t("table.actions"),
                cell: ({ row }) => {
                    const enrollment = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRemoveStudent(enrollment)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Student
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ];
    }, [t, handleRemoveStudent]);

    const { table } = useDataTable({
        columns,
        data: parsedData,
        pageCount: parsedPagination.pageCount,
        enableGlobalFilter: true,
        initialState: {
            sorting: [{ id: "createdAt", desc: true }],
        },
    });

    const tableState = table.getState();
    const queryParams = useMemo(() => {
        const parsed: QueryParams = {
            filter: {
                cohortId: cohortId,
            },
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
        return parsed;
    }, [tableState.sorting, tableState.pagination, debouncedSearchQuery, cohortId]);

    const loadListQuery = trpc.lmsModule.enrollment.list.useQuery(queryParams, { enabled: !!cohortId });

    useEffect(() => {
        if (!loadListQuery.data) return;
        setParsedData(loadListQuery.data.items || []);
        setParsedPagination({
            pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
        });
    }, [loadListQuery.data]);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[UIConstants.permissions.manageCourse]}
        >
            <HeaderTopbar
                header={{
                    title: cohort?.title || "Cohort Students",
                    subtitle: "Manage students enrolled in this cohort",
                }}
                backLink={true}
                rightAction={
                    <CreateButton onClick={handleInviteStudents} text="Invite Users" />
                }
            />

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