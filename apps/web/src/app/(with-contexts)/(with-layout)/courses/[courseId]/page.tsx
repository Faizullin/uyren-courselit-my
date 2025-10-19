"use client";

import { ScrollAnimation } from "@/components/public/scroll-animation";
import { trpc } from "@/utils/trpc";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Star, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import CourseEnrollmentCard from "./_components/course-enrollment-card";
import { CourseErrorBoundary, CourseErrorFallback } from "./_components/course-error-boundary";
import { useCourseData } from "./_components/course-provider";
import { CourseDetailSkeleton } from "./_components/course-skeletons";

const DescriptionEditor = dynamic(
  () =>
    import(
      "@/components/editors/tiptap/templates/description/description-editor"
    ).then((mod) => ({ default: mod.DescriptionEditor })),
  {
    ssr: false,
  },
);

function CourseMainContent() {
  const courseData  = useCourseData();
  const { t } = useTranslation("common");
  const loadCourseDetailedQuery = trpc.lmsModule.courseModule.course.publicGetByIdDetailed.useQuery(
    { id: courseData._id },
    { enabled: !!courseData._id }
  );
  const course = loadCourseDetailedQuery.data;
  if (!course) {
    return null;
  }
  return (
    <>
      {/* Course Header with Title and Meta */}
      <ScrollAnimation variant="fadeUp">
        <div className="space-y-4 m--course-header">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-100">
            {course.title}
          </h1>
          
          {/* Short Introduction */}
          {course.shortDescription && (
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {course.shortDescription}
            </p>
          )}

          {/* Course Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-transparent fill-yellow-500" />
              <span>{course.statsAverageRating}</span>
            </div>
         

            {/* Enrollment Count */}
            {course.statsEnrollmentCount && (
              <>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.statsEnrollmentCount} {t("students")}</span>
                </div>
                <span className="text-gray-400">•</span>
              </>
            )}

            {/* Level Badge */}
            <Badge
              variant="secondary"
              className="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
            >
              {course.level || "Beginner"}
            </Badge>
          </div>

          {/* Course Tags */}
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {course.tags.map((tag: any, index: number) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                >
                  {tag.name || tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Mobile Enrollment Card */}
          <div className="md:hidden my-4">
            <CourseEnrollmentCard 
              course={course}
            />
          </div>
        </div>
      </ScrollAnimation>

      {/* Course Description Card */}
      <ScrollAnimation variant="fadeUp">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm m--course-overview">
          {/* Featured Image */}
          {course.featuredImage && (
            <div className="relative w-full h-64 md:h-80 rounded-t-lg overflow-hidden">
              <Image
                src={
                  course.featuredImage.url ||
                  course.featuredImage.thumbnail ||
                  "/placeholder-course.jpg"
                }
                alt={course.featuredImage.caption || course.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <div className="p-6 space-y-6 m--overview-content">
            <div className="space-y-3 m--description-block">
              {course.description && (
                <DescriptionEditor
                  editable={false}
                  toolbar={false}
                  onEditor={(editor, meta) => {
                    if (meta.reason === "create") {
                      editor!.commands.setMyContent(course.description!);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </ScrollAnimation>
    </>
  );
}

function CourseDetailsContent() {
  const { t } = useTranslation("common");
  const course = useCourseData();

  if (!course) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {t("course_not_found")}
        </h1>
        <p className="text-muted-foreground mb-4">{t("course_not_exist")}</p>
        <Link href="/courses">
          <Button className="bg-[rgb(var(--brand-primary))] hover:bg-[rgb(var(--brand-primary-hover))] text-white">
            {t("back_to_courses")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <CourseErrorBoundary fallback={<CourseErrorFallback error={new Error("Failed to load course content")} reset={() => window.location.reload()} />}>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseMainContent/>
      </Suspense>
    </CourseErrorBoundary>
  );
}

export default function Page() {
  return <CourseDetailsContent />;
}
