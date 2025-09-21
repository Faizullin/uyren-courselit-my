"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { UIConstants } from "@workspace/common-models";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import CommunitiesList from "./list";
const { permissions } = UIConstants;

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const breadcrumbs = [{ label: t("sidebar.communities"), href: "#" }];
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams?.get("page") || "1");

  const handlePageChange = useCallback(
    (value: number) => {
      router.push(`/dashboard/communities?page=${value}`);
    },
    [router],
  );

  return (
    <DashboardContent
      breadcrumbs={breadcrumbs}
      permissions={[permissions.manageCommunity]}
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold mb-4">
          {t("sidebar.communities")}
        </h1>
        <div>
          <Link href={`/dashboard/community/new`}>
            <Button>{t("communities.new_community")}</Button>
          </Link>
        </div>
      </div>
      <CommunitiesList />
      {/* <Resources
        links={[
          {
            href: "https://docs.courselit.app/en/communities/introduction/",
            text: "Create a community",
          },
        ]}
      /> */}
    </DashboardContent>
  );
}
