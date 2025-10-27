"use client";

import { useCourseDetail } from "@/components/course/detail/course-detail-context";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import ProductManageClient from "./_components/product-manage-client";

export default function Page() {
  const { isLoading, loadCourseDetailQuery } = useCourseDetail();
  const { t } = useTranslation("course");

  if (isLoading || !loadCourseDetailQuery.data) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: t("manage.breadcrumb_courses"), href: "/dashboard/lms/courses" },
          { label: "...", href: "#" },
          { label: t("manage.breadcrumb_manage"), href: "#" },
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

  return <ProductManageClient />;
}
