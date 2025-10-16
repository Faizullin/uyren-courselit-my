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
import { DeleteConfirmNiceDialog, NiceModal, useDialogControl, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TagCreateEditDialog } from "./_components/tag-create-edit-dialog";

type ItemType = GeneralRouterOutputs["siteModule"]["tag"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.siteModule.tag.list.useQuery>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const tagDialogControl = useDialogControl<string | null>();
    const [parsedData, setParsedData] = useState<ItemType[]>([]);
    const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const breadcrumbs = useMemo(() => [{ label: "Tags", href: "#" }], []);

    const deleteMutation = trpc.siteModule.tag.delete.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Tag deleted successfully" });
            loadListQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleDelete = useCallback((tag: ItemType) => {
        NiceModal.show(DeleteConfirmNiceDialog, {
            title: "Delete Tag",
            message: `Are you sure you want to delete "${tag.name}"?`,
            data: tag,
        }).then((result) => {
            if (result.reason === "confirm") {
                deleteMutation.mutate({ id: tag._id });
            }
        });
    }, [deleteMutation]);

    const handleEdit = useCallback((tag: ItemType) => {
        tagDialogControl.show(tag._id);
    }, [tagDialogControl]);

    const columns: ColumnDef<ItemType>[] = useMemo(() => {
        return [
            {
                accessorKey: "name",
                header: "Tag Name",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.getValue("name")}</Badge>
                    </div>
                ),
            },
            {
                accessorKey: "slug",
                header: "Slug",
                cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue("slug")}</div>,
            },
            {
                accessorKey: "createdAt",
                header: "Created",
                cell: ({ row }) => {
                    const date = row.getValue("createdAt") as Date;
                    return date ? <div className="text-sm text-muted-foreground">{format(new Date(date), "MMM dd, yyyy")}</div> : "-";
                },
            },
            {
                id: "actions",
                header: t("table.actions"),
                cell: ({ row }) => {
                    const tag = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(tag)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t("table.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(tag)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("table.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ];
    }, [t, handleDelete, handleEdit]);

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
            parsed.search = { q: debouncedSearchQuery };
        }
        return parsed;
    }, [tableState.sorting, tableState.pagination, debouncedSearchQuery]);

    const loadListQuery = trpc.siteModule.tag.list.useQuery(queryParams);

    useEffect(() => {
        if (!loadListQuery.data) return;
        setParsedData(loadListQuery.data.items || []);
        setParsedPagination({
            pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
        });
    }, [loadListQuery.data]);

    const handleCreateSuccess = useCallback(() => {
        loadListQuery.refetch();
    }, [loadListQuery.refetch]);

    const handleCreateClick = useCallback(() => {
        tagDialogControl.show(null);
    }, [tagDialogControl]);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[UIConstants.permissions.manageSite]}
        >
            <HeaderTopbar
                header={{
                    title: "Tags",
                    subtitle: "Manage tags to organize your content",
                }}
                rightAction={
                    <CreateButton onClick={handleCreateClick} text="Add Tag" />
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
                        </div>
                        <DataTable table={table}>
                            <DataTableToolbar table={table} />
                        </DataTable>
                    </div>
                </CardContent>
            </Card>
            <TagCreateEditDialog
                control={tagDialogControl}
                onSuccess={handleCreateSuccess}
            />
        </DashboardContent>
    );
}

