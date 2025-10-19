"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BookOpen, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.student.courses.title"), href: "#" }];

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const loadEnrollmentsQuery = trpc.lmsModule.enrollment.list.useQuery({
        pagination: { skip: 0, take: 100 },
        filter: {
            status: statusFilter !== "all" ? statusFilter as any : undefined,
        },
    });

    const loadProgressQuery = trpc.lmsModule.student.getCourseProgress.useQuery({});

    const enrollments = loadEnrollmentsQuery.data?.items || [];
    const progressData = loadProgressQuery.data || [];

    // Create progress map
    const progressMap = new Map(
        progressData.map((p: any) => [p.courseId, p])
    );

    // Filter enrollments by search
    const filteredEnrollments = enrollments.filter((enrollment: any) => {
        if (!search) return true;
        const courseTitle = enrollment.course?.title?.toLowerCase() || "";
        return courseTitle.includes(search.toLowerCase());
    });

    const isLoading = loadEnrollmentsQuery.isLoading || loadProgressQuery.isLoading;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.student.courses.title"),
                    subtitle: "Track your enrolled courses and progress",
                }}
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <Input
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Course Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <CourseCardSkeleton key={i} />
                    ))}
                </div>
            ) : filteredEnrollments.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEnrollments.map((enrollment: any) => {
                        const progress = progressMap.get(enrollment.courseId.toString());
                        return (
                            <CourseCard
                                key={enrollment._id}
                                enrollment={enrollment}
                                progress={progress}
                            />
                        );
                    })}
                </div>
            )}
        </DashboardContent>
    );
}

function CourseCard({ enrollment, progress }: { enrollment: any; progress: any }) {
    const course = enrollment.course;
    const percentComplete = progress?.percentComplete || 0;
    const completedLessons = progress?.completedLessons || 0;
    const totalLessons = progress?.totalLessons || 0;

    return (
        <Link href={`/dashboard/student/courses/${enrollment.courseId}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative">
                    {course?.featuredImage?.file ? (
                        <img
                            src={course.featuredImage.file}
                            alt={course.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                        />
                    ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur">
                            {enrollment.status}
                        </Badge>
                    </div>
                </div>

                <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {course?.title || "Untitled Course"}
                    </h3>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{percentComplete}%</span>
                        </div>
                        <ProgressBar value={percentComplete} />
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>
                                {completedLessons} of {totalLessons} lessons completed
                            </span>
                        </div>
                    </div>

                    {/* Enrollment Date */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                        <Clock className="h-4 w-4" />
                        <span>Enrolled {format(new Date(enrollment.createdAt), "MMM d, yyyy")}</span>
                    </div>

                    {/* Action Button */}
                    <Button className="w-full" variant="outline">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {percentComplete === 0 ? "Start Learning" : "Continue Learning"}
                    </Button>
                </CardContent>
            </Card>
        </Link>
    );
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
                className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    value === 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function CourseCardSkeleton() {
    return (
        <Card>
            <Skeleton className="h-48 w-full rounded-t-lg" />
            <CardContent className="p-4 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16">
            <div className="flex justify-center mb-4">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No courses enrolled yet</h3>
            <p className="text-muted-foreground mb-6">
                Start your learning journey by enrolling in courses
            </p>
            <Link href="/courses">
                <Button>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Courses
                </Button>
            </Link>
        </div>
    );
}