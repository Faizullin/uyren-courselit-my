"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ClipboardList, Calendar, CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { format, differenceInDays, isPast } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.assignments.title"), href: "#" }];

    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadAssignmentSubmissionsQuery = trpc.lmsModule.assignmentModule.assignmentSubmission.listMine.useQuery({
        pagination: { skip: 0, take: 100 },
        filter: statusFilter !== "all" ? { status: statusFilter as any } : undefined,
    });

    const submissions = loadAssignmentSubmissionsQuery.data?.items || [];
    const isLoading = loadAssignmentSubmissionsQuery.isLoading;

    // Group by status
    const pending = submissions.filter((s: any) => s.status === "draft" || s.status === "not_submitted");
    const submitted = submissions.filter((s: any) => s.status === "submitted");
    const graded = submissions.filter((s: any) => s.status === "graded");

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.student.assignments.title"),
                    subtitle: "View and submit your assignments",
                }}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Pending"
                    value={pending.length}
                    icon={<Clock className="h-5 w-5" />}
                    color="text-orange-600"
                    bgColor="bg-orange-100"
                />
                <StatCard
                    title="Submitted"
                    value={submitted.length}
                    icon={<FileText className="h-5 w-5" />}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                />
                <StatCard
                    title="Graded"
                    value={graded.length}
                    icon={<CheckCircle className="h-5 w-5" />}
                    color="text-green-600"
                    bgColor="bg-green-100"
                />
            </div>

            {/* Filter */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">All Assignments</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Assignments</SelectItem>
                        <SelectItem value="draft">Not Submitted</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="graded">Graded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Assignments List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <AssignmentCardSkeleton key={i} />
                    ))}
                </div>
            ) : submissions.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-4">
                    {submissions.map((submission: any) => (
                        <AssignmentCard key={submission._id} submission={submission} />
                    ))}
                </div>
            )}
        </DashboardContent>
    );
}

function AssignmentCard({ submission }: { submission: any }) {
    const assignment = submission.assignment;
    const dueDate = assignment?.dueDate ? new Date(assignment.dueDate) : null;
    const isOverdue = dueDate && isPast(dueDate) && submission.status !== "graded";
    const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;

    return (
        <Link href={`/dashboard/student/assignments/${assignment?._id || submission._id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
                            isOverdue ? "bg-red-100" : "bg-primary/10"
                        )}>
                            <ClipboardList className={cn(
                                "h-6 w-6",
                                isOverdue ? "text-red-600" : "text-primary"
                            )} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">
                                        {assignment?.title || "Assignment"}
                                    </h3>
                                    {assignment?.course?.title && (
                                        <p className="text-sm text-muted-foreground">
                                            {assignment.course.title}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge status={submission.status} />
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {/* Due Date */}
                                {dueDate && (
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        isOverdue && "text-red-600 font-medium"
                                    )}>
                                        {isOverdue ? (
                                            <AlertCircle className="h-4 w-4" />
                                        ) : (
                                            <Calendar className="h-4 w-4" />
                                        )}
                                        <span>
                                            {isOverdue ? "Overdue" : `Due ${format(dueDate, "MMM d, yyyy")}`}
                                            {!isOverdue && daysUntilDue !== null && daysUntilDue <= 7 && (
                                                <span className="ml-1 text-orange-600 font-medium">
                                                    ({daysUntilDue} {daysUntilDue === 1 ? "day" : "days"} left)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* Points */}
                                {assignment?.totalPoints && (
                                    <span>{assignment.totalPoints} points</span>
                                )}

                                {/* Score */}
                                {submission.status === "graded" && typeof submission.score === "number" && (
                                    <span className="text-green-600 font-medium">
                                        Score: {submission.score}{assignment?.totalPoints && `/${assignment.totalPoints}`}
                                        {typeof submission.percentageScore === "number" && ` (${Math.round(submission.percentageScore)}%)`}
                                    </span>
                                )}

                                {/* Submitted Date */}
                                {submission.submittedAt && (
                                    <div className="flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span>Submitted {format(new Date(submission.submittedAt), "MMM d")}</span>
                                    </div>
                                )}
                            </div>

                            {/* Feedback */}
                            {submission.status === "graded" && submission.feedback && (
                                <div className="mt-3 p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-1">Instructor Feedback:</p>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {submission.feedback}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        draft: { label: "Not Submitted", variant: "outline" },
        not_submitted: { label: "Not Submitted", variant: "outline" },
        submitted: { label: "Submitted", variant: "secondary" },
        graded: { label: "Graded", variant: "default" },
    };

    const config = variants[status] || { label: status, variant: "outline" as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
}

function StatCard({ title, value, icon, color, bgColor }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${bgColor} ${color}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AssignmentCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16">
            <div className="flex justify-center mb-4">
                <ClipboardList className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground">
                Assignments from your courses will appear here
            </p>
        </div>
    );
}
