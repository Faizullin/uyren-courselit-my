"use client";

import { trpc } from "@/utils/trpc";
import { useParams } from "next/navigation";
import { CourseProvider } from "./_components/course-context";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { CheckCircle2, Clock, PlayCircle, Lock, ChevronRight, ChevronDown, Video, FileText } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { useState } from "react";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const loadCourseQuery = trpc.lmsModule.courseModule.course.publicGetById.useQuery({
    id: courseId,
  }, {
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const loadEnrollmentQuery = trpc.lmsModule.enrollment.getMembership.useQuery({
    courseId: courseId,
  }, {
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const loadLessonsQuery = trpc.lmsModule.courseModule.lesson.list.useQuery({
    filter: { courseId: courseId },
    pagination: { skip: 0, take: 100 },
  }, {
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });

  const course = loadCourseQuery.data;
  const enrollment = loadEnrollmentQuery.data?.enrollment;
  const lessonsData = loadLessonsQuery.data?.items || [];
  const isLoading = loadCourseQuery.isLoading || loadEnrollmentQuery.isLoading || loadLessonsQuery.isLoading;

  // Use lessons data directly since getMembership already provides progress info
  const lessons = lessonsData;

  if (isLoading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        <div className="w-80 flex-shrink-0">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="flex-1">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Course or enrollment not found.
      </div>
    );
  }

  const progress = enrollment?.progress || 0;
  const totalLessons = enrollment?.totalLessons || 0;
  const completedLessons = enrollment?.completedLessons || 0;

  return (
    <CourseProvider
      value={{
        course: course,
        enrollment: enrollment || null,
        isLoading: false,
        refetch: () => {
          loadCourseQuery.refetch();
          loadEnrollmentQuery.refetch();
        },
      }}
    >
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Side - Main Course Info */}
        <div className="flex-1">
          {children}
        </div>

        {/* Right Sidebar - Course Structure */}
        <div className="w-80 flex-shrink-0">
          <Card className="h-full">
            <CardContent className="p-0 h-full flex flex-col">
              {/* Course Header */}
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg mb-4">{course.title}</h2>
                
                {/* Cohort Information Card */}
                {enrollment?.cohortId && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-900 font-medium">Cohort:</span>
                        <span className="text-blue-700">{(enrollment as any).cohort?.title || `Cohort ${enrollment.cohortId.slice(-6)}`}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-900 font-medium">Started:</span>
                        <span className="text-blue-700">
                          {(enrollment as any).cohort?.beginDate 
                            ? new Date((enrollment as any).cohort.beginDate).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            : (enrollment.createdAt && typeof enrollment.createdAt === 'string') 
                              ? new Date(enrollment.createdAt).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                }) 
                              : 'Unknown'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-900 font-medium">Students:</span>
                        <span className="text-blue-700">{(enrollment as any).cohort?.maxCapacity || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progress}% completed</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              </div>

              {/* Course Structure */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <CourseStructure 
                    course={course}
                    courseId={courseId}
                    lessons={lessons}
                    enrollment={enrollment}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CourseProvider>
  );
}

function CourseStructure({ course, courseId, lessons, enrollment }: { course: any; courseId: string; lessons: any[]; enrollment: any }) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Use real course chapters from backend
  const chapters = course?.chapters || [];

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  // Get lessons for a specific chapter
  const getChapterLessons = (lessonOrderIds: string[]) => {
    return lessons.filter(lesson => 
      lessonOrderIds.includes(lesson._id)
    ).sort((a, b) => {
      const aIndex = lessonOrderIds.indexOf(a._id);
      const bIndex = lessonOrderIds.indexOf(b._id);
      return aIndex - bIndex;
    });
  };

  // Check if chapter is completed (all lessons completed)
  const isChapterCompleted = (lessonOrderIds: string[]) => {
    // For now, return false since we don't have individual lesson progress
    // This can be enhanced later with detailed progress data
    return false;
  };

  // Check if lesson is completed
  const isLessonCompleted = (lesson: any) => {
    // For now, return false since we don't have individual lesson progress
    // This can be enhanced later with detailed progress data
    return false;
  };

  if (!chapters || chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No chapters available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {chapters.map((chapter: any) => {
        const chapterLessons = getChapterLessons(chapter.lessonOrderIds);
        const isCompleted = isChapterCompleted(chapter.lessonOrderIds);
        const hasLessons = chapterLessons.length > 0;

        return (
          <div key={chapter._id}>
            <button
              onClick={() => hasLessons && toggleChapter(chapter._id)}
              className={cn(
                "flex items-center gap-2 w-full p-2 text-left hover:bg-muted rounded text-sm",
                expandedChapters.has(chapter._id) && "bg-muted",
                !hasLessons && "cursor-default"
              )}
            >
              {hasLessons ? (
                expandedChapters.has(chapter._id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
              <span className={cn(
                "flex-1",
                isCompleted && "text-green-600"
              )}>
                {chapter.title}
                {isCompleted && " ✓"}
              </span>
              {hasLessons && (
                <span className="text-xs text-muted-foreground">
                  {chapterLessons.length}
                </span>
              )}
            </button>
            
            {expandedChapters.has(chapter._id) && hasLessons && (
              <div className="ml-6 space-y-1">
                {chapterLessons.map((lesson: any) => (
                  <Link
                    key={lesson._id}
                    href={`/dashboard/student/courses/${courseId}/lessons/${lesson.slug || lesson._id}`}
                    className={cn(
                      "flex items-center gap-2 p-2 hover:bg-muted rounded text-sm transition-colors",
                      isLessonCompleted(lesson) && "text-green-600"
                    )}
                  >
                    <Video className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 truncate">{lesson.title}</span>
                    {isLessonCompleted(lesson) && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}