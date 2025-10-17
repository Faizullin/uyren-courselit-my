"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { Skeleton } from "@workspace/ui/components/skeleton";
import ProductManageClient from "./_components/product-manage-client";
import { useCourseContext } from "../_components/course-context";

export default function Page() {
  const { course, isLoading } = useCourseContext();

  if (isLoading) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: "Courses", href: "/dashboard/lms/courses" },
          { label: "...", href: "#" },
          { label: "Manage", href: "#" },
        ]}
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </DashboardContent>
    );
  }

  if (!course) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: "Courses", href: "/dashboard/lms/courses" },
          { label: "Course", href: "#" },
          { label: "Manage", href: "#" },
        ]}
      >
        <div className="text-center py-8">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </DashboardContent>
    );
  }

  return <ProductManageClient product={course} />;
}
