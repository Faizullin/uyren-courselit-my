"use client";

import { trpc } from "@/utils/trpc";
import { useParams } from "next/navigation";
import { CourseProvider } from "./_components/course-context";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const loadCourseQuery = trpc.lmsModule.courseModule.course.getById.useQuery({
    id: courseId,
  }, {
    enabled: !!courseId,
  });

  return (
    <CourseProvider
      value={{
        course: loadCourseQuery.data || null,
        isLoading: loadCourseQuery.isLoading,
        refetch: () => loadCourseQuery.refetch(),
      }}
    >
      {children}
    </CourseProvider>
  );
}