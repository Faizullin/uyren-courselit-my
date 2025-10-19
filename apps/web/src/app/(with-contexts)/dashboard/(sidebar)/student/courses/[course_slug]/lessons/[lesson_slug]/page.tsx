"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from "lucide-react";
import { trpc } from "@/utils/trpc";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useToast } from "@workspace/components-library";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const params = useParams<{ course_slug: string; lesson_slug: string }>();
    const router = useRouter();
    const { toast } = useToast();

    const loadLessonQuery = trpc.lmsModule.courseModule.lesson.getById.useQuery(
        { id: params.lesson_slug },
        { enabled: !!params.lesson_slug }
    );

    const loadCourseQuery = trpc.lmsModule.courseModule.course.getById.useQuery(
        { id: params.course_slug },
        { enabled: !!params.course_slug }
    );

    const loadProgressQuery = trpc.lmsModule.enrollment.getCourseProgress.useQuery(
        { courseId: params.course_slug },
        { enabled: !!params.course_slug }
    );

    const markCompleteMutation = trpc.lmsModule.enrollment.updateProgress.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Lesson marked as complete",
            });
            loadProgressQuery.refetch();
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const lesson = loadLessonQuery.data;
    const course = loadCourseQuery.data;
    const progress = loadProgressQuery.data;

    const isCompleted = progress?.lessons?.some((l: any) =>
        l.lessonId.toString() === params.lesson_slug && l.status === "completed"
    );

    const handleMarkComplete = useCallback(async () => {
        if (!params.course_slug || !params.lesson_slug) return;

        // Find enrollment ID
        const enrollmentQuery = await trpc.lmsModule.enrollment.list.useQuery({
            filter: { courseId: params.course_slug },
            pagination: { skip: 0, take: 1 },
        });

        const enrollmentId = enrollmentQuery.data?.items[0]?._id;
        if (!enrollmentId) {
            toast({
                title: "Error",
                description: "Enrollment not found",
                variant: "destructive",
            });
            return;
        }

        await markCompleteMutation.mutateAsync({
            data: {
                enrollmentId,
                lessonId: params.lesson_slug,
                status: "completed",
            },
        });
    }, [params.course_slug, params.lesson_slug, markCompleteMutation, toast]);

    const breadcrumbs = [
        { label: "My Courses", href: "/dashboard/student/courses" },
        { label: course?.title || "Course", href: `/dashboard/student/courses/${params.course_slug}` },
        { label: lesson?.title || "Lesson", href: "#" },
    ];

    if (loadLessonQuery.isLoading || loadCourseQuery.isLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <LoadingSkeleton />
            </DashboardContent>
        );
    }

    if (!lesson) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <EmptyState courseId={params.course_slug} />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: lesson.title,
                    subtitle: course?.title,
                }}
                rightAction={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Course
                        </Button>
                        {!isCompleted && (
                            <Button onClick={handleMarkComplete} disabled={markCompleteMutation.isPending}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {markCompleteMutation.isPending ? "Marking..." : "Mark as Complete"}
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {lesson.title}
                                {isCompleted && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Lesson Content */}
                            {lesson.videoUrl && (
                                <div className="aspect-video bg-black rounded-lg mb-6">
                                    <video
                                        src={lesson.videoUrl}
                                        controls
                                        className="w-full h-full rounded-lg"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            )}

                            {lesson.content && (
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                                />
                            )}

                            {!lesson.content && !lesson.videoUrl && (
                                <p className="text-muted-foreground text-center py-8">
                                    No content available for this lesson
                                </p>
                            )}

                            {/* Lesson Resources */}
                            {lesson.resources && lesson.resources.length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="font-semibold mb-4">Lesson Resources</h3>
                                    <div className="space-y-2">
                                        {lesson.resources.map((resource: any, index: number) => (
                                            <a
                                                key={index}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary transition-colors"
                                            >
                                                <BookOpen className="h-4 w-4" />
                                                <span className="text-sm">{resource.title || resource.url}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-6">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Previous Lesson
                        </Button>
                        <Button>
                            Next Lesson
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>

                {/* Sidebar */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Lesson Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {lesson.duration && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Duration</p>
                                    <p className="font-medium">{lesson.duration} minutes</p>
                                </div>
                            )}

                            {lesson.type && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{lesson.type}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium">
                                    {isCompleted ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" />
                                            Completed
                                        </span>
                                    ) : (
                                        "In Progress"
                                    )}
                                </p>
                            </div>

                            {lesson.order !== undefined && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Lesson Number</p>
                                    <p className="font-medium">Lesson {lesson.order + 1}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Course Progress Card */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Course Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Completion</span>
                                    <span className="font-medium">{progress?.percentComplete || 0}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress?.percentComplete || 0}%` }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {progress?.completedLessons || 0} of {progress?.totalLessons || 0} lessons
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardContent>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="aspect-video w-full mb-6" />
                            <Skeleton className="h-32 w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/3" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-24 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ courseId }: { courseId: string }) {
    return (
        <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lesson not found</h3>
            <p className="text-muted-foreground mb-6">
                The lesson you're looking for doesn't exist or you don't have access to it
            </p>
            <Link href={`/dashboard/student/courses/${courseId}`}>
                <Button>Back to Course</Button>
            </Link>
        </div>
    );
}