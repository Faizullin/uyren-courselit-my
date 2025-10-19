"use client";

import { useTranslation } from "react-i18next";
import { TrendingUp, Award, Target, Calendar, CheckCircle2 } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.grades.title"), href: "#" }];

    const loadGradesSummaryQuery = trpc.lmsModule.student.getGradesSummary.useQuery();

    const isLoading = loadGradesSummaryQuery.isLoading;
    const data = loadGradesSummaryQuery.data;
    const averageGrade = data?.averageGrade || 0;
    const totalAssignments = data?.totalAssignments || 0;
    const submissions = data?.submissions || [];

    // Calculate performance metrics
    const excellentCount = submissions.filter((s: any) => (s.percentageScore || 0) >= 90).length;
    const goodCount = submissions.filter((s: any) => {
        const score = s.percentageScore || 0;
        return score >= 70 && score < 90;
    }).length;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.student.grades.title"),
                    subtitle: "Track your academic performance",
                }}
            />

            {isLoading ? (
                <LoadingSkeleton />
            ) : (
                <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Average Grade"
                            value={`${averageGrade}%`}
                            icon={<TrendingUp className="h-5 w-5" />}
                            color="text-blue-600"
                            bgColor="bg-blue-100"
                        />
                        <StatCard
                            title="Total Graded"
                            value={totalAssignments}
                            icon={<CheckCircle2 className="h-5 w-5" />}
                            color="text-green-600"
                            bgColor="bg-green-100"
                        />
                        <StatCard
                            title="Excellent (90%+)"
                            value={excellentCount}
                            icon={<Award className="h-5 w-5" />}
                            color="text-yellow-600"
                            bgColor="bg-yellow-100"
                        />
                        <StatCard
                            title="Good (70-89%)"
                            value={goodCount}
                            icon={<Target className="h-5 w-5" />}
                            color="text-purple-600"
                            bgColor="bg-purple-100"
                        />
                    </div>

                    {/* Recent Grades */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Grades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {submissions.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="space-y-4">
                                    {submissions.map((submission: any) => (
                                        <GradeCard key={submission._id} submission={submission} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </DashboardContent>
    );
}

function GradeCard({ submission }: { submission: any }) {
    const assignment = submission.assignment;
    const percentageScore = submission.percentageScore || 0;
    const score = submission.score || 0;
    const totalPoints = assignment?.totalPoints || 100;

    // Determine grade color
    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600 bg-green-50";
        if (percentage >= 80) return "text-blue-600 bg-blue-50";
        if (percentage >= 70) return "text-yellow-600 bg-yellow-50";
        if (percentage >= 60) return "text-orange-600 bg-orange-50";
        return "text-red-600 bg-red-50";
    };

    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary transition-colors">
            {/* Score Badge */}
            <div className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center font-bold",
                getGradeColor(percentageScore)
            )}>
                <span className="text-2xl">{Math.round(percentageScore)}</span>
                <span className="text-xs">%</span>
            </div>

            {/* Assignment Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">
                            {assignment?.title || "Assignment"}
                        </h4>
                        {assignment?.course?.title && (
                            <p className="text-sm text-muted-foreground">
                                {assignment.course.title}
                            </p>
                        )}
                    </div>
                    <PerformanceBadge percentage={percentageScore} />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">
                        Score: {score}/{totalPoints} points
                    </span>
                    {submission.gradedAt && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Graded {format(new Date(submission.gradedAt), "MMM d, yyyy")}</span>
                        </div>
                    )}
                </div>

                {/* Feedback */}
                {submission.feedback && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Instructor Feedback:</p>
                        <p className="text-sm text-muted-foreground">
                            {submission.feedback}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function PerformanceBadge({ percentage }: { percentage: number }) {
    if (percentage >= 90) {
        return <Badge className="bg-green-500">Excellent</Badge>;
    }
    if (percentage >= 80) {
        return <Badge className="bg-blue-500">Very Good</Badge>;
    }
    if (percentage >= 70) {
        return <Badge className="bg-yellow-500">Good</Badge>;
    }
    if (percentage >= 60) {
        return <Badge variant="secondary">Fair</Badge>;
    }
    return <Badge variant="destructive">Needs Improvement</Badge>;
}

function StatCard({ title, value, icon, color, bgColor }: {
    title: string;
    value: string | number;
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

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-12">
            <div className="flex justify-center mb-4">
                <TrendingUp className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No grades yet</h3>
            <p className="text-muted-foreground">
                Your graded assignments will appear here
            </p>
        </div>
    );
}