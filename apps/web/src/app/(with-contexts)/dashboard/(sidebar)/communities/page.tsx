"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import Resources from "@/components/resources";
import {
  MANAGE_COMMUNITIES_PAGE_HEADING,
  NEW_COMMUNITY_BUTTON,
} from "@/lib/ui/config/strings";
import { UIConstants } from "@workspace/common-models";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import CommunitiesList from "./list";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COMMUNITIES_PAGE_HEADING, href: "#" }];

export default function Page() {
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
          {MANAGE_COMMUNITIES_PAGE_HEADING}
        </h1>
        <div>
          <Link href={`/dashboard/community/new`}>
            <Button>{NEW_COMMUNITY_BUTTON}</Button>
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
