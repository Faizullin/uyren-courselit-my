"use client";

import { Metadata, ResolvingMetadata } from "next";
import DashboardContent from "@/components/admin/dashboard-content";
import { CreateButton } from "@/components/admin/layout/create-button";
import HeaderTopbar from "@/components/admin/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { type ColumnDef } from "@tanstack/react-table";
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
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { Archive, Edit, Eye, FileText, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const breadcrumbs = [
  { label: "LMS", href: "#" },
  { label: "Assignments", href: "#" },
];

type ItemType =
  GeneralRouterOutputs["lmsModule"]["assignmentModule"]["assignment"]["list"]["items"][number];
type QueryParams = Parameters<
  typeof trpc.lmsModule.assignmentModule.assignment.list.useQuery
>[0];

export default function Page() {
  const { t } = useTranslation("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [parsedData, setParsedData] = useState<Array<ItemType>>([]);
  const [parsedPageination, setParsedPagination] = useState({
    pageCount: 1,
  });

  const archiveMutation =
    trpc.lmsModule.assignmentModule.assignment.archive.useMutation({
      onSuccess: () => {
        // Refetch the data to update the list
        loadListQuery.refetch();
      },
    });

  const handleArchive = useCallback(
    (assignment: ItemType) => {
      if (confirm("Are you sure you want to archive this assignment?")) {
        archiveMutation.mutate(assignment.id);
      }
    },
    [archiveMutation],
  );

  const columns: ColumnDef<ItemType>[] = useMemo(() => {
    return [
      {
        accessorKey: "title",
        header: t("table.title"),
        cell: ({ row }) => {
          const obj = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium">{obj.title}</div>
                <div className="text-sm text-muted-foreground">
                  {obj.description}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "courseId",
        header: t("table.course"),
        cell: ({ row }) => {
          const assignment = row.original;
          const course = (assignment as any).course;
          return (
            <Badge variant="outline">
              {course?.title || assignment.courseId || t("table.no_course")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "ownerId",
        header: t("table.owner"),
        cell: ({ row }) => {
          const assignment = row.original;
          const owner = (assignment as any).owner;
          return (
            <div className="text-sm text-muted-foreground">
              {owner?.name || owner?.email || assignment.ownerId || t("table.unknown")}
            </div>
          );
        },
      },
      {
        accessorKey: "assignmentType",
        header: t("table.type"),
        cell: ({ row }) => {
          const assignmentType = row.getValue("assignmentType") as string;
          return (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
              {assignmentType
                ?.replace("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()) || t("table.unknown")}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const getStatusVariant = (status: string) => {
            switch (status) {
              case "published":
                return "default";
              case "draft":
                return "secondary";
              case "archived":
                return "destructive";
              default:
                return "secondary";
            }
          };

          const getStatusLabel = (status: string) => {
            switch (status) {
              case "published":
                return t("table.published");
              case "draft":
                return t("table.draft");
              case "archived":
                return t("table.archived");
              default:
                return t("table.unknown");
            }
          };

          return (
            <Badge variant={getStatusVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          );
        },
        meta: {
          label: t("table.status"),
          variant: "select",
          options: [
            { label: t("table.published"), value: "published" },
            { label: t("table.draft"), value: "draft" },
            { label: t("table.archived"), value: "archived" },
          ],
        },
        enableColumnFilter: true,
      },
      {
        accessorKey: "createdAt",
        header: t("table.created"),
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as string;
          return (
            <div className="text-sm text-muted-foreground">
              {new Date(date).toLocaleDateString()}
            </div>
          );
        },
        meta: {
          label: t("table.created"),
          variant: "date",
        },
      },
      {
        id: "actions",
        header: t("table.actions"),
        cell: ({ row }) => {
          const obj = row.original;
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
                  <Link href={`/dashboard/lms/assignments/${obj.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t("table.view_details")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/lms/assignments/${obj.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("table.edit")}
                  </Link>
                </DropdownMenuItem>
                {obj.status !== "archived" && (
                  <DropdownMenuItem
                    onClick={() => handleArchive(obj)}
                    className="text-orange-600"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {t("table.archive")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [handleArchive]);

  const { table } = useDataTable({
    columns,
    data: parsedData,
    pageCount: parsedPageination.pageCount,
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
          ? ((
              tableState.columnFilters.find((filter) => filter.id === "status")
                ?.value as string[]
            )[0] as "published" | "draft" | "archived")
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
    trpc.lmsModule.assignmentModule.assignment.list.useQuery(queryParams);

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
            title: t("lms.modules.assignments.title"),
            subtitle: t("lms.modules.assignments.description"),
          }}
          rightAction={<CreateButton href="/dashboard/lms/assignments/new" />}
        />
        <Card>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Input
                placeholder={t("table.search_placeholder")}
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
