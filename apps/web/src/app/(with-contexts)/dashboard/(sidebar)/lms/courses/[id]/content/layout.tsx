import DashboardContent from "@/components/dashboard/dashboard-content";
import { getCachedCourseData } from "@/lib/course/get-course-data";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { truncate } from "@workspace/utils";
import { CourseNavSidebar } from "../_components/course-nav-sidebar";

export default async function ContentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseData = await getCachedCourseData(id);
  return (
    <DashboardContent
      breadcrumbs={[
        { label: "Courses", href: "/dashboard/lms/courses" },
        { label: truncate(courseData.title, 20), href: `/dashboard/lms/courses/${id}/content` },
      ]}
    >
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={70} minSize={30} className="mr-4">
          <div className="h-full">{children}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={0} maxSize={50}>
          <CourseNavSidebar editable={true} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </DashboardContent>
  );
}
