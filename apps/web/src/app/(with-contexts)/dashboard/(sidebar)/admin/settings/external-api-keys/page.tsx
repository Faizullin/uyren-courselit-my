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
import { ExternalApiKeyStatusEnum } from "@workspace/common-logic/models/api/external-api-key.types";
import { DeleteConfirmNiceDialog, NiceModal, useDialogControl, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Copy, Edit, Eye, EyeOff, Key, MoreHorizontal, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalApiKeyCreateEditDialog } from "./_components/external-api-key-create-edit-dialog";

type ItemType = GeneralRouterOutputs["siteModule"]["externalApiKey"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.siteModule.externalApiKey.list.useQuery>[0];

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const dialogControl = useDialogControl<string | null>();
  const [parsedData, setParsedData] = useState<ItemType[]>([]);
  const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const breadcrumbs = useMemo(() => [
    { label: "Admin", href: "/dashboard/admin" },
    { label: "Settings", href: "/dashboard/admin/settings" },
    { label: "Website Settings", href: "/dashboard/admin/settings/website-settings" },
    { label: "External API Keys", href: "#" },
  ], []);

  const deleteMutation = trpc.siteModule.externalApiKey.delete.useMutation({
    onSuccess: () => {
      toast({ title: t("common:dashboard.success"), description: "API key deleted successfully" });
      loadListQuery.refetch();
    },
    onError: (err: any) => {
      toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = trpc.siteModule.externalApiKey.revoke.useMutation({
    onSuccess: () => {
      toast({ title: t("common:dashboard.success"), description: "API key revoked successfully" });
      loadListQuery.refetch();
    },
    onError: (err: any) => {
      toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleDelete = useCallback((apiKey: ItemType) => {
    NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Delete API Key",
      message: `Are you sure you want to delete "${apiKey.title}"? This action cannot be undone.`,
      data: apiKey,
    }).then((result) => {
      if (result.reason === "confirm") {
        deleteMutation.mutate({ id: apiKey._id });
      }
    });
  }, [deleteMutation]);

  const handleRevoke = useCallback((apiKey: ItemType) => {
    NiceModal.show(DeleteConfirmNiceDialog, {
      title: "Revoke API Key",
      message: `Are you sure you want to revoke "${apiKey.title}"? This will immediately disable the key.`,
      data: apiKey,
    }).then((result) => {
      if (result.reason === "confirm") {
        revokeMutation.mutate({ id: apiKey._id });
      }
    });
  }, [revokeMutation]);

  const getStatusBadge = useCallback((status: ExternalApiKeyStatusEnum) => {
    const variants: Record<ExternalApiKeyStatusEnum, "default" | "secondary" | "destructive"> = {
      [ExternalApiKeyStatusEnum.ACTIVE]: "default",
      [ExternalApiKeyStatusEnum.INACTIVE]: "secondary",
      [ExternalApiKeyStatusEnum.REVOKED]: "destructive",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  }, []);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  }, [toast]);

  const columns: ColumnDef<ItemType>[] = useMemo(() => {
    return [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const apiKey = row.original;
          return (
            <div>
              <div className="font-medium">{apiKey.title}</div>
              {apiKey.description && (
                <div className="text-sm text-muted-foreground">{apiKey.description}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "publicKey",
        header: "Public Key",
        cell: ({ row }) => {
          const [visible, setVisible] = useState(false);
          const publicKey = row.original.publicKey;
          return (
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {visible ? publicKey : `${publicKey.substring(0, 12)}...`}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(publicKey, "Public key")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
      },
      {
        accessorKey: "owner",
        header: "Owner",
        cell: ({ row }) => {
          const owner = row.original.owner;
          return <div>{owner?.fullName || owner?.username || "-"}</div>;
        },
      },
      {
        accessorKey: "lastUsedAt",
        header: "Last Used",
        cell: ({ row }) => {
          const date = row.getValue("lastUsedAt") as Date;
          return date ? format(new Date(date), "MMM dd, yyyy HH:mm") : "Never";
        },
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => {
          const date = row.getValue("expiresAt") as Date;
          return date ? format(new Date(date), "MMM dd, yyyy") : "Never";
        },
      },
      {
        id: "actions",
        header: t("table.actions"),
        cell: ({ row }) => {
          const apiKey = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => dialogControl.show(apiKey._id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRevoke(apiKey)}
                  disabled={apiKey.status === ExternalApiKeyStatusEnum.REVOKED}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Revoke
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(apiKey)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("table.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [t, getStatusBadge, handleDelete, handleRevoke, copyToClipboard]);

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

  const loadListQuery = trpc.siteModule.externalApiKey.list.useQuery(queryParams);

  useEffect(() => {
    if (!loadListQuery.data) return;
    setParsedData(loadListQuery.data.items || []);
    setParsedPagination({
      pageCount: Math.ceil((loadListQuery.data.total || 0) / loadListQuery.data.meta.take),
    });
  }, [loadListQuery.data]);

  const handleSuccess = useCallback(() => {
    loadListQuery.refetch();
  }, [loadListQuery.refetch]);

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <HeaderTopbar
        header={{
          title: "External API Keys",
          subtitle: "Manage third-party API keys for external integrations",
        }}
        rightAction={
          <CreateButton onClick={() => dialogControl.show(null)} text="Create API Key" />
        }
      />

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 pt-6">
            <Input
              placeholder="Search API keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <DataTable table={table}>
              <DataTableToolbar table={table} />
            </DataTable>
          </div>
        </CardContent>
      </Card>

      <ExternalApiKeyCreateEditDialog
        control={dialogControl}
        onSuccess={handleSuccess}
      />
    </DashboardContent>
  );
}

