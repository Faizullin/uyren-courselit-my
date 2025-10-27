"use client";

import { useTranslation } from "react-i18next";
import { TrendingUp, Award, Target, Calendar, CheckCircle2, FileText, HelpCircle } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { GeneralRouterOutputs } from "@/server/api/types";


type GradeItem = GeneralRouterOutputs["lmsModule"]["student"]["getGradesSummary"]["grades"][number];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("dashboard:student.grades.title"), href: "#" }];

    // TODO: update grades only wihtin course

    const loadGradesSummaryQuery = trpc.lmsModule.student.getGradesSummary.useQuery();

    const data = loadGradesSummaryQuery.data;
    const averageGrade = data?.averageGrade || 0;
    const totalGraded = data?.totalGraded || 0;
    const grades = data?.grades || [];

    const excellentCount = grades.filter((g) => g.percentageScore >= 90).length;
    const goodCount = grades.filter((g) => g.percentageScore >= 70 && g.percentageScore < 90).length;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("dashboard:student.grades.title"),
                    subtitle: t("dashboard:student.grades.subtitle"),
                }}
            />

            {loadGradesSummaryQuery.isLoading ? (
                <LoadingSkeleton />
            ) : (
                <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title={t("dashboard:student.grades.average_grade")}
                            value={`${averageGrade}%`}
                            icon={<TrendingUp className="h-4 w-4" />}
                            color="text-blue-600"
                            bgColor="bg-blue-100"
                        />
                        <StatCard
                            title={t("dashboard:student.grades.total_graded")}
                            value={totalGraded}
                            icon={<CheckCircle2 className="h-4 w-4" />}
                            color="text-green-600"
                            bgColor="bg-green-100"
                        />
                        <StatCard
                            title={t("dashboard:student.grades.excellent")}
                            value={excellentCount}
                            icon={<Award className="h-4 w-4" />}
                            color="text-yellow-600"
                            bgColor="bg-yellow-100"
                        />
                        <StatCard
                            title={t("dashboard:student.grades.good")}
                            value={goodCount}
                            icon={<Target className="h-4 w-4" />}
                            color="text-purple-600"
                            bgColor="bg-purple-100"
                        />
                    </div>

                    {/* Recent Grades */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{t("dashboard:student.grades.recent_grades")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {grades.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="space-y-2">
                                    {grades.map((grade) => (
                                        <GradeCard key={grade._id} grade={grade} />
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

function GradeCard({ grade }: { grade: GradeItem }) {
    const { t } = useTranslation(["common"]);
    const isQuiz = grade.type === "quiz";
    
    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600 bg-green-50";
        if (percentage >= 80) return "text-blue-600 bg-blue-50";
        if (percentage >= 70) return "text-yellow-600 bg-yellow-50";
        if (percentage >= 60) return "text-orange-600 bg-orange-50";
        return "text-red-600 bg-red-50";
    };

    const href = isQuiz && grade.attemptId
        ? `/quiz/${grade.entityId}/attempts/${grade.attemptId}/results`
        : `/dashboard/student/assignments/${grade.entityId}/`;

    return (
        <Link href={href} className="block">
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer">
                <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded flex flex-col items-center justify-center font-bold text-sm",
                    getGradeColor(grade.percentageScore)
                )}>
                    <span className="text-lg">{Math.round(grade.percentageScore)}</span>
                    <span className="text-[10px]">%</span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isQuiz ? (
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        ) : (
                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <h4 className="font-medium text-sm truncate">{grade.title}</h4>
                        <PerformanceBadge percentage={grade.percentageScore} />
                    </div>
                    {grade.course && (
                        <p className="text-xs text-muted-foreground truncate mb-1">{grade.course}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium">
                            {grade.score}/{grade.totalPoints} {t("common:points")}
                        </span>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(grade.gradedAt), "MMM d, yyyy")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function PerformanceBadge({ percentage }: { percentage: number }) {
    const { t } = useTranslation(["common"]);
    if (percentage >= 90) {
        return <Badge className="bg-green-500 text-[10px] h-5">{t("common:excellent")}</Badge>;
    }
    if (percentage >= 80) {
        return <Badge className="bg-blue-500 text-[10px] h-5">{t("common:very_good")}</Badge>;
    }
    if (percentage >= 70) {
        return <Badge className="bg-yellow-500 text-[10px] h-5">{t("common:good")}</Badge>;
    }
    if (percentage >= 60) {
        return <Badge variant="secondary" className="text-[10px] h-5">{t("common:fair")}</Badge>;
    }
    return <Badge variant="destructive" className="text-[10px] h-5">{t("common:needs_improvement")}</Badge>;
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
            <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">{title}</p>
                        <p className="text-xl font-bold mt-0.5">{value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${bgColor} ${color}`}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-4 pb-4">
                            <Skeleton className="h-12 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-1/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EmptyState() {
    const { t } = useTranslation(["dashboard"]);
    return (
        <div className="text-center py-8">
            <div className="flex justify-center mb-3">
                <TrendingUp className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">{t("dashboard:student.grades.no_grades_yet")}</h3>
            <p className="text-sm text-muted-foreground">
                {t("dashboard:student.grades.graded_items_appear_here")}
            </p>
        </div>
    );
}