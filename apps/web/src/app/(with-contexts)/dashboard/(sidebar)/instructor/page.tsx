"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
    BookOpen,
    Calendar as CalendarIcon,
    Clock,
    Eye,
    Star,
    TrendingUp,
    Users,
    Video
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function InstructorPage() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [
        { label: t("sidebar.instructor"), href: "/dashboard/instructor" },
    ];

    // Single optimized query that gets all data from backend
    const dashboardQuery = trpc.lmsModule.instructor.getDashboardStats.useQuery();

    const stats = dashboardQuery.data?.stats;
    const recentCourses = dashboardQuery.data?.recentCourses || [];
    const upcomingEvents = dashboardQuery.data?.upcomingEvents || [];
    const isLoading = dashboardQuery.isLoading;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-6">
                <HeaderTopbar
                    header={{
                        title: t("sidebar.instructor"),
                        subtitle: "Manage your courses and track progress"
                    }}
                />

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="p-6">
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
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                                            <p className="text-3xl font-bold mt-1">{stats?.totalCourses || 0}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {stats?.publishedCourses || 0} published
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                            <p className="text-3xl font-bold mt-1">{stats?.totalStudents || 0}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Across all courses
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                                            <Users className="h-6 w-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                                            <p className="text-3xl font-bold mt-1">
                                                {stats && stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {stats && stats.avgRating > 0 ? "Out of 5.0" : "No ratings yet"}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                                            <Star className="h-6 w-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                                            <p className="text-3xl font-bold mt-1">{stats?.draftCourses || 0}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Need publishing
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                                            <TrendingUp className="h-6 w-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Section - My Courses */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>My Courses</CardTitle>
                                <Button asChild size="sm" disabled={isLoading}>
                                    <Link href="/dashboard/lms/courses/new">Create Course</Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="p-4 border rounded-lg">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <Skeleton className="h-5 w-3/4 mb-2" />
                                                        <Skeleton className="h-4 w-full mb-1" />
                                                        <Skeleton className="h-4 w-2/3" />
                                                    </div>
                                                    <Skeleton className="h-6 w-20 ml-4" />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-4 w-16" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : recentCourses.length === 0 ? (
                                    <div className="text-center py-12">
                                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Create your first course to get started
                                        </p>
                                        <Button asChild>
                                            <Link href="/dashboard/lms/courses/new">Create Course</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentCourses.map((course) => (
                                            <Link
                                                key={course._id.toString()}
                                                href={`/dashboard/lms/courses/${course._id}`}
                                                className="block"
                                            >
                                                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-base mb-1">{course.title}</h4>
                                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                                {course.shortDescription || "No description"}
                                                            </p>
                                                        </div>
                                                        <Badge variant={course.published ? "default" : "secondary"} className="ml-4">
                                                            {course.published ? "Published" : "Draft"}
                                                        </Badge>
                                                    </div>

                                                    {/* Course Stats */}
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <BookOpen className="h-4 w-4" />
                                                            {course.chapters?.length || 0} chapters
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            {course.statsEnrollmentCount || 0} students
                                                        </span>
                                                        {course.statsAverageRating > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                                {course.statsAverageRating.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}

                                        {(stats?.totalCourses || 0) > 5 && (
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link href="/dashboard/lms/courses">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View All Courses ({stats?.totalCourses})
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[...Array(4)].map((_, i) => (
                                            <Skeleton key={i} className="h-10 w-full" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Button asChild variant="outline" className="justify-start">
                                            <Link href="/dashboard/lms/courses">
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                Manage Courses
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="justify-start">
                                            <Link href="/dashboard/lms/assignments">
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Assignments
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="justify-start">
                                            <Link href="/dashboard/lms/live-classes">
                                                <Video className="h-4 w-4 mr-2" />
                                                Live Classes
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="justify-start">
                                            <Link href="/dashboard/lms/schedule">
                                                <CalendarIcon className="h-4 w-4 mr-2" />
                                                Master Schedule
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Section - Calendar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5" />
                                    Upcoming Events
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
                                        <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No upcoming events
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map((event) => (
                                            <div
                                                key={event._id.toString()}
                                                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${event.status === 'live'
                                                            ? 'bg-green-100 text-green-600'
                                                            : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        <Video className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm mb-1 truncate">
                                                            {event.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {new Date(event.scheduledStartTime).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        {event.status === 'live' && (
                                                            <Badge variant="default" className="mt-2 text-xs">
                                                                Live Now
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {upcomingEvents.length >= 10 && (
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link href="/dashboard/lms/schedule">
                                                    View Full Calendar
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
