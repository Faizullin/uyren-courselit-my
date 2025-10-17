"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { CourseNavSidebar } from "../_components/course-nav-sidebar";
import { useParams } from "next/navigation";

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  return (
    <DashboardContent
      breadcrumbs={[
        { label: "Courses", href: "/dashboard/lms/courses" },
        { label: "Content", href: `/dashboard/lms/courses/${courseId}/content` },
      ]}
    >
      <div className="flex flex-1 gap-4 h-full">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        <CourseNavSidebar courseId={courseId} />
      </div>
    </DashboardContent>
  );
}
