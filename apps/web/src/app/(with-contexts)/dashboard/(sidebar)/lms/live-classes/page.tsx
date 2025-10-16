"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/components/data-table/use-data-table";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { LiveClassStatusEnum, LiveClassTypeEnum } from "@workspace/common-logic/models/lms/live-class.types";
import { DeleteConfirmNiceDialog, NiceModal, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { format } from "date-fns";
import { Archive, Calendar, Edit, ExternalLink, Eye, MoreHorizontal, Play, Table } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type ItemType = GeneralRouterOutputs["lmsModule"]["liveClass"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.lmsModule.liveClass.list.useQuery>[0];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { toast } = useToast();
    const [parsedData, setParsedData] = useState<ItemType[]>([]);
    const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<LiveClassStatusEnum | "all">("all");
    const [typeFilter, setTypeFilter] = useState<LiveClassTypeEnum | "all">("all");
    const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const breadcrumbs = useMemo(() => [{ label: t("common:dashboard.liveClasses.title"), href: "#" }], [t]);

    const deleteMutation = trpc.lmsModule.liveClass.delete.useMutation({
        onSuccess: () => {
            toast({ title: t("common:dashboard.success"), description: "Live class deleted successfully" });
            loadListQuery.refetch();
        },
        onError: (err: any) => {
            toast({ title: t("common:dashboard.error"), description: err.message, variant: "destructive" });
        },
    });

    const handleDelete = useCallback((liveClass: ItemType) => {
        NiceModal.show(DeleteConfirmNiceDialog, {
            title: "Delete Live Class",
            message: `Are you sure you want to delete "${liveClass.title}"?`,
            data: liveClass,
        }).then((result) => {
            if (result.reason === "confirm") {
                deleteMutation.mutate({ id: liveClass._id });
            }
        });
    }, [deleteMutation]);

    const getStatusBadge = useCallback((status: LiveClassStatusEnum) => {
        const variants: Record<LiveClassStatusEnum, "default" | "secondary" | "destructive" | "outline"> = {
            [LiveClassStatusEnum.SCHEDULED]: "secondary",
            [LiveClassStatusEnum.LIVE]: "default",
            [LiveClassStatusEnum.ENDED]: "outline",
            [LiveClassStatusEnum.CANCELLED]: "destructive",
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
    }, []);

    const getTypeBadge = useCallback((type: LiveClassTypeEnum) => {
        const labels: Record<LiveClassTypeEnum, string> = {
            [LiveClassTypeEnum.LECTURE]: "Lecture",
            [LiveClassTypeEnum.WORKSHOP]: "Workshop",
            [LiveClassTypeEnum.Q_AND_A]: "Q&A",
            [LiveClassTypeEnum.GROUP_DISCUSSION]: "Discussion",
            [LiveClassTypeEnum.PRESENTATION]: "Presentation",
        };
        return <Badge variant="outline">{labels[type]}</Badge>;
    }, []);

    const getPlatform = useCallback((url?: string) => {
        if (!url) return "Other";
        if (url.includes("zoom.us")) return "Zoom";
        if (url.includes("meet.google.com")) return "Google Meet";
        if (url.includes("teams.microsoft.com")) return "MS Teams";
        return "Other";
    }, []);

    const getDuration = useCallback((start: Date, end: Date) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }, []);

    const columns: ColumnDef<ItemType>[] = useMemo(() => {
        return [
            {
                accessorKey: "title",
                header: t("table.title"),
                cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
            },
            {
                accessorKey: "type",
                header: "Type",
                cell: ({ row }) => getTypeBadge(row.getValue("type")),
            },
            {
                accessorKey: "cohortId",
                header: "Course/Cohort",
                cell: ({ row }) => {
                    const entity = row.original.entity;
                    return <div className="text-sm">{entity?.entityIdStr || "-"}</div>;
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => getStatusBadge(row.getValue("status")),
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
                accessorKey: "scheduledStartTime",
                header: "Start Time",
                cell: ({ row }) => {
                    const date = row.getValue("scheduledStartTime") as Date;
                    return date ? format(new Date(date), "MMM dd, HH:mm") : "-";
                },
            },
            {
                id: "duration",
                header: "Duration",
                cell: ({ row }) => {
                    const start = row.original.scheduledStartTime;
                    const end = row.original.scheduledEndTime;
                    return start && end ? getDuration(start, end) : "-";
                },
            },
            {
                id: "platform",
                header: "Platform",
                cell: ({ row }) => {
                    const platform = getPlatform(row.original.meetingUrl);
                    return <Badge variant="secondary" className="text-xs">{platform}</Badge>;
                },
            },
            {
                id: "actions",
                header: t("table.actions"),
                cell: ({ row }) => {
                    const liveClass = row.original;
                    const isScheduled = liveClass.status === LiveClassStatusEnum.SCHEDULED;
                    const hasRecording = liveClass.status === LiveClassStatusEnum.ENDED && liveClass.recordingUrl;

                    return (
                        <div className="flex items-center gap-2">
                            {isScheduled && liveClass.meetingUrl && (
                                <Button size="sm" variant="default" asChild>
                                    <a href={liveClass.meetingUrl} target="_blank" rel="noopener noreferrer">
                                        <Play className="h-3 w-3 mr-1" />
                                        Start
                                    </a>
                                </Button>
                            )}
                            {hasRecording && (
                                <Button size="sm" variant="outline" asChild>
                                    <a href={liveClass.recordingUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Recording
                                    </a>
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/lms/live-classes/${liveClass._id}`}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            {t("table.view_details")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/lms/live-classes/${liveClass._id}`}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t("table.edit")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(liveClass)} className="text-red-600">
                                        <Archive className="h-4 w-4 mr-2" />
                                        {t("table.delete")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            },
        ];
    }, [t, getStatusBadge, getTypeBadge, getPlatform, getDuration, handleDelete]);

    const { table } = useDataTable({
        columns,
        data: parsedData,
        pageCount: parsedPagination.pageCount,
        enableGlobalFilter: true,
        initialState: {
            sorting: [{ id: "scheduledStartTime", desc: false }],
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
        if (statusFilter !== "all" || typeFilter !== "all") {
            parsed.filter = {};
            if (statusFilter !== "all") parsed.filter.status = statusFilter;
            if (typeFilter !== "all") parsed.filter.type = typeFilter;
        }
        return parsed;
    }, [tableState.sorting, tableState.pagination, debouncedSearchQuery, statusFilter, typeFilter]);

    const loadListQuery = trpc.lmsModule.liveClass.list.useQuery(queryParams);

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

    const statistics = useMemo(() => {
        const total = parsedData.length;
        const scheduled = parsedData.filter(c => c.status === LiveClassStatusEnum.SCHEDULED).length;
        const live = parsedData.filter(c => c.status === LiveClassStatusEnum.LIVE).length;
        const ended = parsedData.filter(c => c.status === LiveClassStatusEnum.ENDED).length;
        return { total, scheduled, live, ended };
    }, [parsedData]);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[UIConstants.permissions.manageAnyCourse, UIConstants.permissions.manageCourse]}
        >
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.liveClasses.title"),
                    subtitle: t("common:dashboard.liveClasses.description"),
                }}
            />

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "calendar")} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="table">
                            <Table className="h-4 w-4 mr-2" />
                            Table View
                        </TabsTrigger>
                        <TabsTrigger value="calendar">
                            <Calendar className="h-4 w-4 mr-2" />
                            Calendar View
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="table">
                    <Card>
                        <CardContent>
                            <div className="flex flex-col gap-4 pt-6">
                                <div className="flex flex-wrap gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Search</Label>
                                        <Input
                                            placeholder={t("table.search_placeholder")}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-[250px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Status</Label>
                                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LiveClassStatusEnum | "all")}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                {Object.values(LiveClassStatusEnum).map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Type</Label>
                                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LiveClassTypeEnum | "all")}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value={LiveClassTypeEnum.LECTURE}>Lecture</SelectItem>
                                                <SelectItem value={LiveClassTypeEnum.WORKSHOP}>Workshop</SelectItem>
                                                <SelectItem value={LiveClassTypeEnum.Q_AND_A}>Q&A</SelectItem>
                                                <SelectItem value={LiveClassTypeEnum.GROUP_DISCUSSION}>Discussion</SelectItem>
                                                <SelectItem value={LiveClassTypeEnum.PRESENTATION}>Presentation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DataTable table={table}>
                                    <DataTableToolbar table={table} />
                                </DataTable>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid gap-4">
                                {parsedData.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No live classes scheduled
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {parsedData
                                            .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
                                            .map((liveClass) => (
                                                <div key={liveClass._id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold">{liveClass.title}</h3>
                                                                {getStatusBadge(liveClass.status)}
                                                                {getTypeBadge(liveClass.type)}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {format(new Date(liveClass.scheduledStartTime), "EEEE, MMM dd, yyyy")}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-sm">
                                                                <span>🕐 {format(new Date(liveClass.scheduledStartTime), "HH:mm")} - {format(new Date(liveClass.scheduledEndTime), "HH:mm")}</span>
                                                                <span>⏱️ {getDuration(liveClass.scheduledStartTime, liveClass.scheduledEndTime)}</span>
                                                                <span>💻 {getPlatform(liveClass.meetingUrl)}</span>
                                                                {liveClass.entity?.entityIdStr && <span>📚 {liveClass.entity.entityIdStr}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {liveClass.status === LiveClassStatusEnum.SCHEDULED && liveClass.meetingUrl && (
                                                                <Button size="sm" variant="default" asChild>
                                                                    <a href={liveClass.meetingUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Play className="h-3 w-3 mr-1" />
                                                                        Start
                                                                    </a>
                                                                </Button>
                                                            )}
                                                            <Link href={`/dashboard/lms/live-classes/${liveClass._id}`}>
                                                                <Button size="sm" variant="outline">
                                                                    <Edit className="h-3 w-3 mr-1" />
                                                                    Edit
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardContent>
    );
}