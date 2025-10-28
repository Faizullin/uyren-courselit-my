"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { DataTable } from "@workspace/components-library";
import { DataTableToolbar } from "@workspace/components-library";
import { useDataTable } from "@workspace/components-library";
import { formattedLocaleDate } from "@/lib/ui/utils";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { DeleteConfirmNiceDialog, NiceModal, useToast } from "@workspace/components-library";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";


type UserItemType =
    GeneralRouterOutputs["userModule"]["user"]["list"]["items"][number];
type QueryParams = Parameters<
    typeof trpc.userModule.user.list.useQuery
>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const breadcrumbs = useMemo(() => [{ label: t("sidebar.users"), href: "#" }], [t]);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "restricted">("all");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [parsedData, setParsedData] = useState<Array<UserItemType>>([]);
    const [parsedPagination, setParsedPagination] = useState({
        pageCount: 1,
    });

    const deleteMutation = trpc.userModule.user.delete.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "User deleted successfully" });
            loadUsersQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleDelete = useCallback((user: UserItemType) => {
        NiceModal.show(DeleteConfirmNiceDialog, {
            title: "Delete User",
            message: `Are you sure you want to delete "${user.fullName || user.email}"?`,
            data: user,
        }).then((result) => {
            if (result.reason === "confirm") {
                deleteMutation.mutate({ id: user._id });
            }
        });
    }, [deleteMutation]);

    const getUserNamePreview = (user?: UserItemType) => {
        if (!user?.firstName || !user?.lastName) return user?.email?.charAt(0) || "";
        return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    };

    const columns: ColumnDef<UserItemType>[] = useMemo(() => {
        return [
            {
                accessorKey: "username",
                header: t("users.table.name"),
                cell: ({ row }) => {
                    const user = row.original;
                    const username = user.username || user.email;
                    const fullName = user.fullName;
                    return (
                        <div className="flex items-center gap-2">
                            <Avatar>
                                <AvatarImage
                                    src={
                                        user.avatar
                                            ? user.avatar.url
                                            : "/courselit_backdrop_square.webp"
                                    }
                                />
                                <AvatarFallback>
                                    {getUserNamePreview(user)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <Link href={`/dashboard/admin/users/${user._id}`}>
                                    <span className="font-medium text-base">
                                        {fullName}
                                    </span>
                                </Link>
                                <div className="text-xs text-muted-foreground">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "active",
                header: t("users.table.status"),
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <Badge variant={user.active ? "default" : "secondary"}>
                            {user.active ? "Active" : "Restricted"}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "createdAt",
                header: t("users.table.joined"),
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="text-sm text-muted-foreground">
                            {user.createdAt ? formattedLocaleDate(user.createdAt) : ""}
                        </div>
                    );
                },
            },
            {
                accessorKey: "updatedAt",
                header: t("users.table.last_active"),
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="text-sm text-muted-foreground">
                            {user.updatedAt !== user.createdAt && user.updatedAt
                                ? formattedLocaleDate(user.updatedAt)
                                : ""}
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: t("table.actions"),
                cell: ({ row }) => {
                    const user = row.original;
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
                                    <Link href={`/dashboard/admin/users/${user._id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t("table.view_details")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/admin/users/${user._id}`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t("table.edit")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(user)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("table.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ];
    }, [t, handleDelete]);

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
            parsed.search = {
                q: debouncedSearchQuery,
            };
        }

        return parsed;
    }, [
        tableState.sorting,
        tableState.pagination,
        debouncedSearchQuery,
    ]);

    const loadUsersQuery = trpc.userModule.user.list.useQuery(queryParams);

    useEffect(() => {
        if (!loadUsersQuery.data) return;
        let parsed = loadUsersQuery.data.items || [];

        // Apply client-side status filter
        if (statusFilter !== "all") {
            parsed = parsed.filter(user =>
                statusFilter === "active" ? user.active : !user.active
            );
        }

        setParsedData(parsed);
        setParsedPagination({
            pageCount: Math.ceil(
                (loadUsersQuery.data.total || 0) / loadUsersQuery.data.meta.take,
            ),
        });
    }, [loadUsersQuery.data, statusFilter]);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("sidebar.users"),
                    subtitle: "Manage your platform users",
                }}
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
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "active" | "restricted")}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="restricted">Restricted</SelectItem>
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
