"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { CreateButton } from "@/components/admin/layout/create-button";
import HeaderTopbar from "@/components/admin/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { trpc } from "@/utils/trpc";
import { type ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Edit, Eye, Palette, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BASIC_PUBLICATION_STATUS_TYPE } from "@workspace/common-models";
import { GeneralRouterOutputs } from "@/server/api/types";

const breadcrumbs = [
  { label: "LMS", href: "#" },
  { label: "Themes", href: "#" },
];

type ItemType =
  GeneralRouterOutputs["lmsModule"]["themeModule"]["theme"]["list"]["items"][number];
type QueryParams = Parameters<
  typeof trpc.lmsModule.themeModule.theme.list.useQuery
>[0];

export default function Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [parsedData, setParsedData] = useState<Array<ItemType>>([]);
  const [parsedPagination, setParsedPagination] = useState({
    pageCount: 1,
  });

  const deleteMutation = trpc.lmsModule.themeModule.theme.delete.useMutation({
    onSuccess: () => {
      loadListQuery.refetch();
    },
  });

  const handleDelete = useCallback(
    (theme: ItemType) => {
      if (confirm("Are you sure you want to delete this theme?")) {
        deleteMutation.mutate(theme._id);
      }
    },
    [deleteMutation],
  );

  const columns: ColumnDef<ItemType>[] = useMemo(() => {
    return [
      {
        accessorKey: "name",
        header: "Theme Name",
        cell: ({ row }) => {
          const theme = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded flex items-center justify-center">
                <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium">{theme.name}</div>
                <div className="text-sm text-muted-foreground">
                  {theme.description || "No description"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED
                  ? "default"
                  : status === BASIC_PUBLICATION_STATUS_TYPE.DRAFT
                    ? "secondary"
                    : "destructive"
              }
            >
              <div className="flex items-center gap-1">
                {status === BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED
                  ? "Published"
                  : status === BASIC_PUBLICATION_STATUS_TYPE.DRAFT
                    ? "Draft"
                    : "Archived"}
              </div>
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "select",
          options: [
            { label: "Draft", value: BASIC_PUBLICATION_STATUS_TYPE.DRAFT },
            {
              label: "Published",
              value: BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED,
            },
            {
              label: "Archived",
              value: BASIC_PUBLICATION_STATUS_TYPE.ARCHIVED,
            },
          ],
        },
        enableColumnFilter: true,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as string;
          return (
            <div className="text-sm text-muted-foreground">
              {new Date(date).toLocaleDateString()}
            </div>
          );
        },
        meta: {
          label: "Created Date",
          variant: "date",
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const theme = row.original;
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
                  <Link href={`/dashboard/lms/themes/${theme._id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Theme
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleDelete(theme)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Theme
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [handleDelete]);

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
      filter: {
        status: Array.isArray(
          tableState.columnFilters.find((filter) => filter.id === "status")
            ?.value,
        )
          ? (
              tableState.columnFilters.find((filter) => filter.id === "status")
                ?.value as string[]
            )[0]
          : undefined,
      },
    };
    if (tableState.sorting[0]) {
      parsed.orderBy = {
        field: tableState.sorting[0].id as any,
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
    tableState.columnFilters,
    tableState.globalFilter,
    debouncedSearchQuery,
  ]);

  const loadListQuery =
    trpc.lmsModule.themeModule.theme.list.useQuery(queryParams);

  useEffect(() => {
    if (!loadListQuery.data) return;
    const parsed = loadListQuery.data.items || [];
    setParsedData(parsed);
    setParsedPagination({
      pageCount: Math.ceil(
        loadListQuery.data.total / loadListQuery.data.meta.take,
      ),
    });
  }, [loadListQuery.data]);

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <HeaderTopbar
          header={{
            title: "Themes",
            subtitle: "Manage LMS themes and styling",
          }}
          rightAction={<CreateButton href="/dashboard/lms/themes/new" />}
        />
        <Card>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Input
                placeholder={"Search themes..."}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-40 lg:w-56"
              />
              <DataTable table={table}>
                <DataTableToolbar table={table} />
              </DataTable>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardContent>
  );
}
