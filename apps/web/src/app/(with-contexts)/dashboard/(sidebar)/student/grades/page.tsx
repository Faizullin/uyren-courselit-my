"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("dashboard:student.grades.title"), href: "/dashboard/student/grades" }];

    const cohortsQuery = trpc.lmsModule.cohortModule.cohort.studentListMyCohorts.useQuery({
        pagination: {
            includePaginationCount: false,
        },
    });

    const cohorts = cohortsQuery.data?.items || [];

    const isLoading = cohortsQuery.isLoading;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("dashboard:student.grades.title"),
                    subtitle: t("dashboard:student.grades.subtitle"),
                }}
            />

            {isLoading ? (
                <LoadingSkeleton />
            ) : (
                <>
                    {/* Cohorts List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("dashboard:student.grades.cohorts_list")} ({cohorts.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cohorts.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="space-y-2">
                                    {cohorts.map((cohort: any) => (
                                        <Link
                                            key={cohort._id}
                                            href={`/dashboard/student/grades/cohorts/${cohort._id}`}
                                            className="block"
                                        >
                                            <div className="flex items-center gap-3 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium truncate">{cohort.title}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("dashboard:student.grades.view_cohort_grades")}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </Link>
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


function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
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
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">{t("dashboard:student.grades.no_cohorts")}</h3>
            <p className="text-sm text-muted-foreground">
                {t("dashboard:student.grades.no_cohorts_description")}
            </p>
        </div>
    );
}