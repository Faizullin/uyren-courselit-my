"use client";

import Header from "@/components/layout/header";
import { ScrollAnimation } from "@/components/public/scroll-animation";
import { trpc } from "@/utils/trpc";
import { TextEditorContent } from "@workspace/common-models";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ChevronLeft, ChevronRight, ArrowRight, Lock } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import CourseLessonsSidebar from "../../_components/course-lessons-sidebar";
import { Button } from "@workspace/ui/components/button";
import Footer from "@/components/layout/footer";
import Link from "next/link";
import dynamic from "next/dynamic";
import { memo, useRef } from "react";
import { Editor } from "@tiptap/react";
import { useProfile } from "@/components/contexts/profile-context";
import { Constants } from "@workspace/common-models";
import { useCourseData } from "./course-provider";

const LessonContentEditor = dynamic(
  () =>
    import(
      "@/components/editors/tiptap/templates/lesson-content/lesson-content-editor"
    ).then((mod) => ({ default: mod.LessonContentEditor })),
  { ssr: false },
);

// Custom hook to check lesson access - same logic as sidebar
const useLessonAccess = (courseId: string) => {
  const { profile } = useProfile();

  const { data: membershipStatus, isLoading: isMembershipLoading } =
    trpc.userModule.user.getMembershipStatus.useQuery(
      {
        entityId: courseId,
        entityType: Constants.MembershipEntityType.COURSE,
      },
      {
        enabled: !!courseId && !!profile?.userId,
      },
    );

  const isAuthenticated = !!profile?.userId;
  const hasAccess =
    isAuthenticated && membershipStatus === Constants.MembershipStatus.ACTIVE;

  return {
    isAuthenticated,
    hasAccess,
    isMembershipLoading,
  };
};

// Helper function to check if a specific lesson is accessible - same logic as sidebar
const canAccessLesson = (lesson: any, hasAccess: boolean) => {
  return hasAccess || !lesson?.requiresEnrollment;
};

export default function LessonView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const program = searchParams.get("program") || "primary";

  // Get course data from server-side layout
  const course = useCourseData();

  // Load lesson data using tRPC
  const {
    data: lesson,
    isLoading: lessonLoading,
    error: lessonError,
  } = trpc.lmsModule.courseModule.lesson.publicGetById.useQuery(
    {
      courseId,
      lessonId,
    },
    {
      enabled: !!(courseId && lessonId),
    },
  );

  // Get lesson access permissions
  const { hasAccess, isMembershipLoading } = useLessonAccess(courseId);

  // Get prev/next lesson info from course data (no additional API calls needed)
  const prevLesson = lesson?.meta?.prevLesson
    ? course?.attachedLessons?.find(
        (l) => l.lessonId === lesson.meta.prevLesson,
      )
    : null;

  const nextLesson = lesson?.meta?.nextLesson
    ? course?.attachedLessons?.find(
        (l) => l.lessonId === lesson.meta.nextLesson,
      )
    : null;

  const isLoading = lessonLoading || isMembershipLoading;
  const error = lessonError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Lesson Not Found
          </h1>
          <p className="text-muted-foreground mb-4">
            {error?.message || "The requested lesson could not be found."}
          </p>
          <Link href={`/courses/${courseId}`}>
            <Button className="bg-brand-primary hover:bg-brand-primary-hover">
              Back to Course
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background m--lesson-page">
      <Header />

      <main className="container mx-auto px-4 py-8 m--lesson-main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 m--lesson-layout">
          <div className="lg:col-span-2 space-y-6 m--lesson-content">
            {/* Breadcrumbs */}
            <ScrollAnimation variant="fadeUp">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 m--breadcrumbs">
                <Link
                  href="/"
                  className="hover:text-brand-primary transition-colors"
                >
                  Home
                </Link>
                <span>/</span>
                <Link
                  href="/courses"
                  className="hover:text-brand-primary transition-colors"
                >
                  Courses
                </Link>
                <span>/</span>
                <Link
                  href={`/courses/${courseId}`}
                  className="hover:text-brand-primary transition-colors"
                >
                  {course?.title}
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">
                  {lesson.title}
                </span>
              </div>
            </ScrollAnimation>
            {/* Lesson Content */}
            <ScrollAnimation variant="fadeUp">
              <Card className="border-0 shadow-sm m--lesson-content-card">
                <CardContent>
                  <div className="space-y-6">
                    {/* Attached Image/Thumbnail */}
                    {lesson.media?.thumbnail && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img
                          src={lesson.media.thumbnail}
                          alt={lesson.media.caption || "Lesson thumbnail"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Lesson Content - render LessonContentEditor */}
                    <LessonContentRender
                      content={lesson.content as TextEditorContent}
                    />
                  </div>
                </CardContent>
              </Card>
            </ScrollAnimation>

            {/* Navigation */}
            <ScrollAnimation variant="fadeUp">
              <div className="flex justify-between items-center pt-8 border-t m--lesson-navigation">
                {lesson.meta?.prevLesson ? (
                  canAccessLesson(prevLesson, hasAccess) ? (
                    <Link
                      href={`/courses/${courseId}/lessons/${lesson.meta.prevLesson}`}
                      className="flex items-center text-brand-primary hover:text-brand-primary-hover transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous Lesson
                    </Link>
                  ) : (
                    <div className="flex items-center text-muted-foreground opacity-60">
                      <Lock className="h-4 w-4 mr-1" />
                      Previous Lesson
                    </div>
                  )
                ) : (
                  <div></div>
                )}

                {lesson.meta?.nextLesson ? (
                  canAccessLesson(nextLesson, hasAccess) ? (
                    <Link
                      href={`/courses/${courseId}/lessons/${lesson.meta.nextLesson}`}
                      className="flex items-center text-brand-primary hover:text-brand-primary-hover transition-colors"
                    >
                      Next Lesson
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  ) : (
                    <div className="flex items-center text-muted-foreground opacity-60">
                      Next Lesson
                      <Lock className="h-4 w-4 ml-1" />
                    </div>
                  )
                ) : (
                  <Link href={`/courses/${courseId}`}>
                    <Button className="flex items-center gap-2 bg-[rgb(var(--brand-primary))] hover:bg-[rgb(var(--brand-primary-hover))] text-white">
                      Back to Course
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </ScrollAnimation>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 m--lesson-sidebar">
            <ScrollAnimation variant="fadeUp">
              {course ? (
                <CourseLessonsSidebar
                  course={course}
                  currentLessonId={lessonId}
                  showPricing={!hasAccess}
                  showCourseInfo={true}
                  loading={isLoading}
                />
              ) : (
                <div className="space-y-6">
                  <Skeleton className="h-8 w-32 mx-auto mb-2" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}
            </ScrollAnimation>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

const LessonContentRender = memo((props: { content: TextEditorContent }) => {
  const editorRef = useRef<Editor | null>(null);
  return (
    <LessonContentEditor
      editable={false}
      toolbar={false}
      onEditor={(editor, meta) => {
        if (meta.reason === "create") {
          editorRef.current = editor;
          editorRef.current!.commands.setMyContent(props.content);
        }
      }}
    />
  );
});
