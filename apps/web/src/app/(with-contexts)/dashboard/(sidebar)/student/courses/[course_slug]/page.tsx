"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BookOpen, PlayCircle, CheckCircle2, Lock, ArrowLeft, FileText, Video, ClipboardList } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const params = useParams<{ course_slug: string }>();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("overview");

    const loadCourseQuery = trpc.lmsModule.courseModule.course.getById.useQuery(
        { id: params.course_slug },
        { enabled: !!params.course_slug }
    );

    const loadProgressQuery = trpc.lmsModule.enrollment.getCourseProgress.useQuery(
        { courseId: params.course_slug },
        { enabled: !!params.course_slug }
    );

    const loadLessonsQuery = trpc.lmsModule.courseModule.lesson.list.useQuery(
        {
            filter: { courseId: params.course_slug },
            pagination: { skip: 0, take: 100 },
        },
        { enabled: !!params.course_slug }
    );

    const course = loadCourseQuery.data;
    const progress = loadProgressQuery.data;
    const lessons = loadLessonsQuery.data?.items || [];
    const isLoading = loadCourseQuery.isLoading;

    const breadcrumbs = [
        { label: "My Courses", href: "/dashboard/student/courses" },
        { label: course?.title || "Course", href: "#" },
    ];

    if (isLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <LoadingSkeleton />
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

    const percentComplete = progress?.percentComplete || 0;
    const completedLessons = progress?.completedLessons || 0;
    const totalLessons = progress?.totalLessons || lessons.length || 0;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: course.title,
                    subtitle: course.subtitle,
                }}
                rightAction={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                }
            />

            {/* Course Header with Progress */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Course Image */}
                        {course.featuredImage?.file && (
                            <img
                                src={course.featuredImage.file}
                                alt={course.title}
                                className="w-full md:w-48 h-32 object-cover rounded-lg"
                            />
                        )}

                        {/* Progress Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="secondary">{course.level || "Beginner"}</Badge>
                                <Badge variant="outline">{course.category || "General"}</Badge>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Course Progress</span>
                                    <span className="font-medium">{percentComplete}%</span>
                                </div>
                                <ProgressBar value={percentComplete} />
                                <p className="text-sm text-muted-foreground">
                                    {completedLessons} of {totalLessons} lessons completed
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="lessons">Lessons</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About This Course</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {course.description ? (
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: course.description }}
                                />
                            ) : (
                                <p className="text-muted-foreground">No description available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Total Lessons"
                            value={totalLessons}
                            icon={<BookOpen className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Completed"
                            value={completedLessons}
                            icon={<CheckCircle2 className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Progress"
                            value={`${percentComplete}%`}
                            icon={<PlayCircle className="h-5 w-5" />}
                        />
                    </div>
                </TabsContent>

                {/* Lessons Tab */}
                <TabsContent value="lessons">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Lessons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {lessons.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No lessons available yet
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {lessons.map((lesson: any, index: number) => (
                                        <LessonItem
                                            key={lesson._id}
                                            lesson={lesson}
                                            index={index}
                                            courseId={params.course_slug}
                                            progress={progress}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Assignments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                No assignments yet
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Quizzes Tab */}
                <TabsContent value="quizzes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Quizzes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                No quizzes yet
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardContent>
    );
}

function LessonItem({ lesson, index, courseId, progress }: {
    lesson: any;
    index: number;
    courseId: string;
    progress: any;
}) {
    const isCompleted = progress?.lessons?.some((l: any) =>
        l.lessonId.toString() === lesson._id.toString() && l.status === "completed"
    );

    const isLocked = false; // You can add logic here for locked lessons

    return (
        <Link
            href={isLocked ? "#" : `/dashboard/student/courses/${courseId}/lessons/${lesson._id}`}
            className={cn(
                "block",
                isLocked && "pointer-events-none opacity-60"
            )}
        >
            <div className="flex items-center gap-4 p-4 rounded-lg border hover:border-primary transition-colors">
                {/* Lesson Number/Status */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-medium",
                    isCompleted
                        ? "bg-green-100 text-green-600"
                        : isLocked
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                )}>
                    {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : isLocked ? (
                        <Lock className="h-5 w-5" />
                    ) : (
                        <span>{index + 1}</span>
                    )}
                </div>

                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{lesson.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <LessonTypeIcon type={lesson.type} />
                        {lesson.duration && (
                            <span className="text-sm text-muted-foreground">
                                {lesson.duration} min
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                {isCompleted && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                        Completed
                    </Badge>
                )}
                {isLocked && (
                    <Badge variant="outline">Locked</Badge>
                )}
            </div>
        </Link>
    );
}

function LessonTypeIcon({ type }: { type?: string }) {
    switch (type) {
        case "video":
            return (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Video className="h-3 w-3" />
                    <span>Video</span>
                </div>
            );
        case "text":
            return (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>Article</span>
                </div>
            );
        case "quiz":
            return (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ClipboardList className="h-3 w-3" />
                    <span>Quiz</span>
                </div>
            );
        default:
            return (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>Lesson</span>
                </div>
            );
    }
}

function StatCard({ title, value, icon }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
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

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Course not found</h3>
            <p className="text-muted-foreground mb-6">
                The course you're looking for doesn't exist or you don't have access to it
            </p>
            <Link href="/dashboard/student/courses">
                <Button>Back to Courses</Button>
            </Link>
        </div>
    );
}