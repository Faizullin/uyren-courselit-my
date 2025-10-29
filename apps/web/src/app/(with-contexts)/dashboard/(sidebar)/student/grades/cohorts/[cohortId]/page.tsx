"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, Award, Calendar, CheckCircle2, FileText, HelpCircle, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

type GradeItem = GeneralRouterOutputs["lmsModule"]["student"]["getGradesByCohort"]["grades"][number];

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { cohortId } = useParams<{
        cohortId: string;
    }>();
    
    const loadGradesSummaryQuery = trpc.lmsModule.student.getGradesByCohort.useQuery({ cohortId });
    const cohortQuery = trpc.lmsModule.cohortModule.cohort.getById.useQuery({ id: cohortId }, { enabled: !!cohortId });
    
    const grades = loadGradesSummaryQuery.data?.grades || [];
    const averageGrade = loadGradesSummaryQuery.data?.averageGrade || 0;
    const totalGraded = loadGradesSummaryQuery.data?.totalGraded || 0;
    const cohort = cohortQuery.data;
    
    const breadcrumbs = [
        { label: t("dashboard:student.grades.title"), href: "/dashboard/student/grades" },
        { label: cohort?.title || t("dashboard:student.grades.title"), href: "#" }
    ];

    const excellentCount = grades.filter((g) => g.percentageScore >= 90).length;
    const goodCount = grades.filter((g) => g.percentageScore >= 70 && g.percentageScore < 90).length;

    const chartData = grades.slice(0, 10).reverse().map((grade) => ({
        name: grade.title.substring(0, 10),
        grade: grade.percentageScore
    }));

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex items-center justify-between mb-6">
                <HeaderTopbar
                    header={{
                        title: cohort?.title || t("dashboard:student.grades.title"),
                        subtitle: t("dashboard:student.grades.cohort_subtitle"),
                    }}
                />
                <Link href="/dashboard/student/grades">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("common:back")}
                    </Button>
                </Link>
            </div>

            {loadGradesSummaryQuery.isLoading || cohortQuery.isLoading ? (
                <LoadingSkeleton />
            ) : (
                <>
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
                            title={t("common:excellent")}
                            value={excellentCount}
                            icon={<Award className="h-4 w-4" />}
                            color="text-yellow-600"
                            bgColor="bg-yellow-100"
                        />
                        <StatCard
                            title={t("common:good")}
                            value={goodCount}
                            icon={<Target className="h-4 w-4" />}
                            color="text-purple-600"
                            bgColor="bg-purple-100"
                        />
                    </div>

                    {/* {chartData.length > 0 && (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>{t("dashboard:student.grades.grade_trend")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={{
                                    grade: {
                                        label: "Grade %",
                                        color: "var(--color-chart-1)",  
                                    },
                                }}>
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="grade" fill="var(--color-grade)" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    )} */}

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard:student.grades.all_grades")}</CardTitle>
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
            <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors">
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
    if (percentage >= 90) return <Badge className="bg-green-500 text-[10px] h-5">{t("common:excellent")}</Badge>;
    if (percentage >= 80) return <Badge className="bg-blue-500 text-[10px] h-5">{t("common:very_good")}</Badge>;
    if (percentage >= 70) return <Badge className="bg-yellow-500 text-[10px] h-5">{t("common:good")}</Badge>;
    if (percentage >= 60) return <Badge variant="secondary" className="text-[10px] h-5">{t("common:fair")}</Badge>;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <Skeleton className="h-[200px] w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
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
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">{t("dashboard:student.grades.no_grades_yet")}</h3>
            <p className="text-sm text-muted-foreground">
                {t("dashboard:student.grades.no_grades_description")}
            </p>
        </div>
    );
}
