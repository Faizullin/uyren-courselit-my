"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BookOpen, CheckCircle, ClipboardList, Video, TrendingUp, Calendar, Clock } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from "date-fns";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.title"), href: "#" }];

    const loadDashboardStatsQuery = trpc.lmsModule.student.getDashboardStats.useQuery();

    if (loadDashboardStatsQuery.isLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <HeaderTopbar
                    header={{
                        title: t("common:dashboard.student.title"),
                    }}
                />
                <LoadingSkeleton />
            </DashboardContent>
        );
    }

    const data = loadDashboardStatsQuery.data;
    const stats = data?.stats;
    const recentCourses = data?.recentCourses || [];
    const upcomingAssignments = data?.upcomingAssignments || [];
    const upcomingClasses = data?.upcomingClasses || [];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.student.title"),
                    subtitle: "Track your learning progress and upcoming activities",
                }}
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Enrolled Courses"
                    value={stats?.enrolledCourses || 0}
                    icon={<BookOpen className="h-5 w-5" />}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                />
                <StatCard
                    title="Completion Rate"
                    value={`${stats?.completionRate || 0}%`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    color="text-green-600"
                    bgColor="bg-green-100"
                />
                <StatCard
                    title="Completed Lessons"
                    value={`${stats?.completedLessons || 0}/${stats?.totalLessons || 0}`}
                    icon={<CheckCircle className="h-5 w-5" />}
                    color="text-purple-600"
                    bgColor="bg-purple-100"
                />
                <StatCard
                    title="Pending Assignments"
                    value={stats?.pendingAssignments || 0}
                    icon={<ClipboardList className="h-5 w-5" />}
                    color="text-orange-600"
                    bgColor="bg-orange-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enrolled Courses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Recent Courses</span>
                            <Link href="/dashboard/student/courses">
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentCourses.length === 0 ? (
                            <EmptyState
                                icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
                                text="No courses enrolled yet"
                                action={
                                    <Link href="/courses">
                                        <Button size="sm">Browse Courses</Button>
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="space-y-4">
                                {recentCourses.map((course: any) => (
                                    <Link
                                        key={course._id}
                                        href={`/dashboard/student/courses/${course.courseId}`}
                                        className="block"
                                    >
                                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                                            {course.course?.featuredImage?.thumbnail && (
                                                <img
                                                    src={course.course.featuredImage.thumbnail}
                                                    alt={course.course.title}
                                                    className="w-16 h-16 rounded object-cover"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium truncate">
                                                    {course.course?.title || "Untitled Course"}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Enrolled {format(new Date(course.createdAt), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Live Classes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Upcoming Live Classes</span>
                            <Link href="/dashboard/student/schedule">
                                <Button variant="ghost" size="sm">
                                    View Schedule
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingClasses.length === 0 ? (
                            <EmptyState
                                icon={<Video className="h-12 w-12 text-muted-foreground" />}
                                text="No upcoming live classes"
                            />
                        ) : (
                            <div className="space-y-4">
                                {upcomingClasses.slice(0, 5).map((liveClass: any) => (
                                    <div
                                        key={liveClass._id}
                                        className="flex items-start gap-4 p-3 rounded-lg border"
                                    >
                                        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Video className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{liveClass.title}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {format(new Date(liveClass.scheduledStartTime), "MMM d, h:mm a")}
                                                </span>
                                            </div>
                                            <Badge variant="secondary" className="mt-1">
                                                {liveClass.type || "Lecture"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Assignments */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Pending Assignments</span>
                            <Link href="/dashboard/student/assignments">
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingAssignments.length === 0 ? (
                            <EmptyState
                                icon={<ClipboardList className="h-12 w-12 text-muted-foreground" />}
                                text="No pending assignments"
                            />
                        ) : (
                            <div className="space-y-4">
                                {upcomingAssignments.map((submission: any) => (
                                    <Link
                                        key={submission._id}
                                        href={`/dashboard/student/assignments/${submission.assignmentId}`}
                                        className="block"
                                    >
                                        <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary transition-colors">
                                            <div className="flex-1">
                                                <h4 className="font-medium">
                                                    {submission.assignment?.title || "Assignment"}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                    {submission.assignment?.dueDate && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>
                                                                Due: {format(new Date(submission.assignment.dueDate), "MMM d, yyyy")}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {submission.assignment?.totalPoints && (
                                                        <span>{submission.assignment.totalPoints} points</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={submission.status === "submitted" ? "secondary" : "default"}>
                                                {submission.status}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    );
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

function EmptyState({ icon, text, action }: {
    icon: React.ReactNode;
    text: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="text-center py-8">
            <div className="flex justify-center mb-3">{icon}</div>
            <p className="text-muted-foreground mb-3">{text}</p>
            {action}
        </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/3" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-32 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}