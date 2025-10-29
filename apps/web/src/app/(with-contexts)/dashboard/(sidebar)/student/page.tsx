"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from "date-fns";
import { BookOpen, Calendar, CheckCircle, ClipboardList, Clock, TrendingUp, Eye } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("dashboard:student.dashboard_title"), href: "#" }];

    const loadDashboardStatsQuery = trpc.lmsModule.student.getDashboardStats.useQuery();

    const data = loadDashboardStatsQuery.data;
    const stats = data?.stats;
    const recentCourses = data?.recentCourses || [];
    const upcomingAssignments = data?.upcomingAssignments || [];
    const upcomingEvents = data?.upcomingEvents || [];
    const isLoading = loadDashboardStatsQuery.isLoading;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                {/* <HeaderTopbar
                    header={{
                        title: t("common:dashboard.student.title"),
                        subtitle: t("dashboard:student.dashboard_subtitle")
                    }}
                /> */}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                    {isLoading ? (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <Card key={i}>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-24 mb-2" />
                                                <Skeleton className="h-9 w-16 mb-2" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                            <Skeleton className="h-12 w-12 rounded-full" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    ) : (
                        <>
                            <Link href="/dashboard/student/courses">
                                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardContent>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t("dashboard:student.stats.enrolled_courses")}</p>
                                                <p className="text-2xl font-bold mt-1">{stats?.enrolledCourses || 0}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t("dashboard:student.stats.active_learning")}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                                <BookOpen className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/dashboard/student/courses">
                                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardContent>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t("dashboard:student.stats.completion_rate")}</p>
                                                <p className="text-2xl font-bold mt-1">{stats?.completionRate || 0}%</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t("dashboard:student.stats.overall_progress")}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-green-100 text-green-600">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/dashboard/student/courses">
                                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardContent>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t("dashboard:student.stats.completed_lessons")}</p>
                                                <p className="text-2xl font-bold mt-1">{stats?.completedLessons || 0}/{stats?.totalLessons || 0}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t("dashboard:student.stats.lessons_progress")}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Link href="/dashboard/student/assignments">
                                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <CardContent>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">{t("dashboard:student.stats.pending_assignments")}</p>
                                                <p className="text-2xl font-bold mt-1">{stats?.pendingAssignments || 0}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {t("dashboard:student.stats.need_completion")}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                                                <ClipboardList className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Section - Courses & Assignments */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Recent Courses */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{t("dashboard:student.recent_courses.title")}</CardTitle>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href="/dashboard/student/courses">{t("common:view_all")}</Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="p-4 border rounded-lg">
                                                <Skeleton className="h-5 w-3/4 mb-2" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : recentCourses.length === 0 ? (
                                    <div className="text-center py-12">
                                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">{t("dashboard:student.recent_courses.no_courses")}</h3>
                                        <p className="text-muted-foreground mb-4">
                                            {t("dashboard:student.start_journey")}
                                        </p>
                                        <Button asChild>
                                            <Link href="/courses">{t("dashboard:student.browse_courses")}</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentCourses.map((enrollment) => (
                                            <Link
                                                key={enrollment._id}
                                                href={`/dashboard/student/courses/${enrollment.course._id}`}
                                                className="block"
                                            >
                                                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <h4 className="font-semibold text-base mb-1">
                                                        {enrollment.course?.title || t("dashboard:student.recent_courses.untitled")}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t("common:enrolled")} {enrollment.createdAt && format(new Date(enrollment.createdAt), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                        {(stats?.enrolledCourses || 0) > 5 && (
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link href="/dashboard/student/courses">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {t("common:view_all")}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pending Assignments */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{t("dashboard:student.pending_assignments.title")}</CardTitle>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href="/dashboard/student/assignments">{t("common:view_all")}</Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="p-4 border rounded-lg">
                                                <Skeleton className="h-5 w-3/4 mb-2" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : upcomingAssignments.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">{t("dashboard:student.pending_assignments.no_assignments")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingAssignments.map((assignment) => (
                                            <Link
                                                key={assignment._id}
                                                href={`/dashboard/student/assignments/${assignment._id}`}
                                                className="block"
                                            >
                                                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-medium flex-1">{assignment.title}</h4>
                                                        <Badge variant="default" className="ml-2 capitalize">
                                                            {assignment.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        {assignment.dueDate && (
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>{t("dashboard:student.pending_assignments.due")}: {format(new Date(assignment.dueDate), "MMM d, yyyy")}</span>
                                                            </div>
                                                        )}
                                                        <span>{assignment.totalPoints} {t("common:points")}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Section - Upcoming Events */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t("dashboard:student.upcoming_events.title")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="p-3 border rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                                    <div className="flex-1">
                                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                                        <Skeleton className="h-3 w-1/2" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : upcomingEvents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            {t("dashboard:student.upcoming_events.no_events")}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.slice(0, 5).map((event) => (
                                            <div
                                                key={event._id}
                                                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1 truncate">{event.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {format(new Date(event.startDate), "MMM d, h:mm a")}
                                                            </span>
                                                        </div>
                                                        <Badge variant="outline" className="mt-2 text-xs capitalize">
                                                            {event.type.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {upcomingEvents.length >= 5 && (
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link href="/dashboard/student/schedule">
                                                    {t("dashboard:student.upcoming_events.view_schedule")}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardContent>
    );
}