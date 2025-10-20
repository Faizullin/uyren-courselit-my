"use client";

import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, PlayCircle, Clock, CheckCircle2, BookOpen } from "lucide-react";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useCourseContext } from "../../_components/course-context";
import { trpc } from "@/utils/trpc";
import Link from "next/link";

export default function LessonPage() {
    const { t } = useTranslation(["dashboard", "common"]);
    const params = useParams<{ id: string; lessonId: string }>();
    const { course, enrollment } = useCourseContext();

    const loadLessonQuery = trpc.lmsModule.courseModule.lesson.getById.useQuery(
        { id: params.lessonId },
        { enabled: !!params.lessonId }
    );

    const lesson = loadLessonQuery.data;
    const isLessonLoading = loadLessonQuery.isLoading;

    const breadcrumbs = [
        { label: "Courses", href: "/dashboard/student/courses" },
        { label: course?.title || "Course", href: `/dashboard/student/courses/${params.id}` },
        { label: lesson?.title || "Lesson", href: "#" },
    ];

    if (isLessonLoading) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </DashboardContent>
        );
    }

    if (!course || !lesson) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <div className="text-center py-16">
                    <h3 className="text-lg font-semibold mb-2">Lesson not found</h3>
                    <p className="text-muted-foreground mb-6">
                        The lesson you're looking for doesn't exist or you don't have access to it.
                    </p>
                    <Link href={`/dashboard/student/courses/${params.id}`}>
                        <Button>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Course
                        </Button>
                    </Link>
                </div>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: lesson.title,
                    subtitle: course.title,
                }}
                backLink={`/dashboard/student/courses/${params.id}`}
            />

            {/* Lesson Content */}
            <div className="space-y-6">
                {/* Lesson Title and Author */}
                <div>
                    <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{course.owner?.fullName || 'Unknown Instructor'}</span>
                        <span>•</span>
                        <span>Course</span>
                    </div>
                </div>

                {/* Video Player Area */}
                <Card>
                    <CardContent className="p-0">
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                            {lesson.content ? (
                                <div className="text-center text-white">
                                    <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-80" />
                                    <h3 className="text-xl font-semibold mb-2">Understanding {lesson.title}</h3>
                                    <p className="text-sm opacity-70">Click to start the lesson</p>
                                </div>
                            ) : (
                                <div className="text-center text-white">
                                    <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-80" />
                                    <h3 className="text-xl font-semibold mb-2">Lesson Video</h3>
                                    <p className="text-sm opacity-70">Video content coming soon</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Lesson Description */}
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-4">About this lesson</h2>
                        {lesson.content ? (
                            <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                            />
                        ) : (
                            <div>
                                <p className="text-muted-foreground mb-4">
                                    This tutorial dives into the core concepts covered in this lesson. 
                                    You'll learn the fundamental principles and practical applications.
                                </p>
                                
                                <h3 className="text-lg font-semibold mb-3">What you'll learn:</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Understanding key concepts and their importance</li>
                                    <li>• Practical applications and real-world examples</li>
                                    <li>• Step-by-step implementation guide</li>
                                    <li>• Best practices and common pitfalls to avoid</li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" disabled>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous Lesson
                    </Button>
                    
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm">
                            Mark as Complete
                        </Button>
                        <Button size="sm">
                            Next Lesson
                            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardContent>
    );
}