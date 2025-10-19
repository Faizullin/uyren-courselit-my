"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import { useTranslation } from "react-i18next";
import SchoolsManagement from "./_components/schools-management";

export default function SchoolsPage() {
  const { t } = useTranslation(["dashboard", "common"]);
  const breadcrumbs = [
    { label: t("sidebar.settings"), href: "/dashboard/admin/settings" },
    { label: "Schools", href: "#" },
  ];
  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <SchoolsManagement />
    </DashboardContent>
  );
}
