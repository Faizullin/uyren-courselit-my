"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { ScrollAnimation } from "@/components/public/scroll-animation";
import { ITextEditorContent } from "@workspace/common-logic/lib/text-editor-content";
import { Badge } from "@workspace/ui/components/badge";
import { Star, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslation } from "react-i18next";
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
  const { loadCoursePublicDetailedQuery } = useCoursePublicDetail();
  const { t } = useTranslation("frontend");
  const courseDetailedData = loadCoursePublicDetailedQuery.data;
  if (!courseDetailedData) {
    return null;
  }
  return (
    <div className="w-full space-y-6">
      {/* Course Header with Title and Meta */}
      <ScrollAnimation variant="fadeUp">
        <div className="space-y-4 m--course-header">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-100">
            {courseDetailedData.title}
          </h1>
          
          {/* Short Introduction */}
          {courseDetailedData.shortDescription && (
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
              {courseDetailedData.shortDescription}
            </p>
          )}

          {/* Course Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-transparent fill-yellow-500" />
              <span>{courseDetailedData.statsAverageRating || 0}</span>
            </div>
         

            {/* Enrollment Count */}
            {courseDetailedData.statsEnrollmentCount && (
              <>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{courseDetailedData.statsEnrollmentCount || 0} {t("course_detail.students")}</span>
                </div>
                <span className="text-gray-400">•</span>
              </>
            )}

            {/* Level Badge */}
            <Badge
              variant="secondary"
              className="bg-brand-primary/10 text-brand-primary border-brand-primary/20"
            >
              {courseDetailedData.level }
            </Badge>
          </div>

          {/* Course Tags */}
          {courseDetailedData.tags && courseDetailedData.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {courseDetailedData.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </ScrollAnimation>

      {/* Course Description Card */}
      <ScrollAnimation variant="fadeUp">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm m--course-overview">
          {/* Featured Image */}
          {courseDetailedData.featuredImage && (
            <div className="relative w-full h-64 md:h-80 rounded-t-lg overflow-hidden">
              <Image
                src={
                  courseDetailedData.featuredImage.url ||
                  courseDetailedData.featuredImage.thumbnail ||
                  "/placeholder-course.jpg"
                }
                alt={courseDetailedData.featuredImage.caption || courseDetailedData.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <div className="p-6 space-y-6 m--overview-content">
            <div className="space-y-3 m--description-block">
              {courseDetailedData.description && (
                <DescriptionEditor
                  editable={false}
                  toolbar={false}
                  onEditor={(editor, meta) => {
                    if (meta.reason === "create") {
                      editor!.commands.setMyContent(courseDetailedData.description! as unknown as ITextEditorContent);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </ScrollAnimation>
    </div>
  );
}

export default function Page() {
  const { loadCoursePublicDetailedQuery } = useCoursePublicDetail();

  if (loadCoursePublicDetailedQuery.isLoading) {
    return <CourseDetailSkeleton />;
  }
  return (
    <CourseMainContent/>
  );
}
