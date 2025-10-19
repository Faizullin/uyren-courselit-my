"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { CourseNavSidebar } from "../_components/course-nav-sidebar";
import { useParams } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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
      <PanelGroup direction="horizontal" className="h-full">
        <Panel defaultSize={70} minSize={30} className="mr-4">
          <div className="h-full">{children}</div>
        </Panel>

        <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/20 transition-colors data-[resize-handle-state=drag]:bg-primary/30" />

        <Panel defaultSize={30} minSize={0} maxSize={50}>
          <CourseNavSidebar courseId={courseId} />
        </Panel>
      </PanelGroup>
    </DashboardContent>
  );
}
