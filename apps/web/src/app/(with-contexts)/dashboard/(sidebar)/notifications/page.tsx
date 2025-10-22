"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { NotSupportedException } from "@/server/api/core/exceptions";
import { useTranslation } from "react-i18next";

export default function Page() {
    throw new NotSupportedException();
    const { t } = useTranslation(["dashboard", "common"]);
    const breadcrumbs = [{ label: t("common:dashboard.notifications.title"), href: "#" }];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.notifications.title"),
                }}
            />
        </DashboardContent>
    )
}