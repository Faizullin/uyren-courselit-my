"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2, PlayCircle, User2, BookOpen } from "lucide-react";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useCourseContext } from "./_components/course-context";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const { course, enrollment, isLoading } = useCourseContext();

    const breadcrumbs = [
        { label: "My Courses", href: "/dashboard/student/courses" },
        { label: course?.title || "Course", href: "#" },
    ];

    if (isLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </DashboardContent>
        );
    }

    if (!course) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <EmptyState />
            </DashboardContent>
        );
    }

    const progress = enrollment?.progress || 0;
    const totalLessons = enrollment?.totalLessons || 0;
    const completedLessons = enrollment?.completedLessons || 0;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: course.title,
                    subtitle: "Course Overview",
                }}
            />

            <div className="space-y-6">
                {/* Welcome Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Welcome to {course.title}</CardTitle>
                        <CardDescription className="text-base">
                            {course.description?.content ? 
                                course.description.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...' :
                                'Start your learning journey with this comprehensive course.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-primary mb-1">{totalLessons}</div>
                                <div className="text-sm text-muted-foreground">Total Lessons</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-1">{completedLessons}</div>
                                <div className="text-sm text-muted-foreground">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-1">{progress}%</div>
                                <div className="text-sm text-muted-foreground">Progress</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Course Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Course Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="capitalize">{course.level}</Badge>
                                    <Badge variant={course.published ? "default" : "secondary"}>
                                        {course.published ? 'Published' : 'Draft'}
                                    </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User2 className="h-4 w-4" />
                                    <span>Instructor: {course.owner?.fullName || 'Unknown'}</span>
                                </div>

                                {enrollment?.cohortId && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span>Cohort: {enrollment.cohortId}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Course Progress</span>
                                    <span className="text-sm font-bold">{progress}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                    <div 
                                        className="bg-primary h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{completedLessons} of {totalLessons} lessons completed</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button className="flex-1" size="lg">
                                <PlayCircle className="h-5 w-5 mr-2" />
                                {progress === 0 ? 'Start Learning' : 'Continue Learning'}
                            </Button>
                            <Button variant="outline" className="flex-1" size="lg">
                                View All Lessons
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardContent>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">Course not found</h3>
            <p className="text-muted-foreground mb-6">
                The course you're looking for doesn't exist or you don't have access to it.
            </p>
        </div>
    );
}