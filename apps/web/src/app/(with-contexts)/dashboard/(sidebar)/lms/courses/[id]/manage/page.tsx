"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { Skeleton } from "@workspace/ui/components/skeleton";
import ProductManageClient from "./_components/product-manage-client";
import { useCourseContext } from "../_components/course-context";
import { useTranslation } from "react-i18next";

export default function Page() {
  const { course, isLoading } = useCourseContext();
  const { t } = useTranslation("course");

  if (isLoading) {
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

  if (!course) {
    return (
      <DashboardContent
        breadcrumbs={[
          { label: t("manage.breadcrumb_courses"), href: "/dashboard/lms/courses" },
          { label: t("manage.loading"), href: "#" },
          { label: t("manage.breadcrumb_manage"), href: "#" },
        ]}
      >
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t("manage.not_found")}</p>
        </div>
      </DashboardContent>
    );
  }

  return <ProductManageClient product={course} />;
}
