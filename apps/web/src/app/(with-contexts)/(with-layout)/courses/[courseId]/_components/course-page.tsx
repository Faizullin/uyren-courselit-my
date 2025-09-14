"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Clock, Users } from "lucide-react";
import Link from "next/link";

import "@/styles/course-content.scss";
import { cn } from "@workspace/ui/lib/utils";
import CourseLessonsSidebar from "../../_components/course-lessons-sidebar";

type CourseDetailType =
  GeneralRouterOutputs["lmsModule"]["courseModule"]["course"]["publicGetByCourseId"];

interface CoursePageProps {
  course: CourseDetailType;
}

export default function CoursePage({ course }: CoursePageProps) {
  return (
    <main className="bg-background min-h-screen m--course-details-page">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <CourseBreadcrumbs course={course} className="mb-6" />
              <h1 className="text-3xl font-bold text-foreground">
                {course.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.customers.length} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration} hours</span>
                </div>
                <Badge variant="secondary">{course.level}</Badge>
              </div>
            </div>
            <Card>
              <CardContent>
                <DescriptionEditorRender course={course} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <CourseLessonsSidebar course={course} />
          </div>
        </div>
      </div>
    </main>
  );
}

const CourseBreadcrumbs = ({
  course,
  className,
}: {
  course: CourseDetailType;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground m--breadcrumbs",
        className,
      )}
    >
      <Link href="/">Home</Link>
      <span>/</span>
      <Link href="/courses">Courses</Link>
      <span>/</span>
      <span className="text-foreground">{course.title}</span>
    </div>
  );
};

const DescriptionEditorRender = ({ course }: { course: CourseDetailType }) => {
  if (!course.description) return null;
  return (
    <div
      className="m-course-description-wrapper"
      dangerouslySetInnerHTML={{ __html: course.description!["content"] }}
    />
  );
};
