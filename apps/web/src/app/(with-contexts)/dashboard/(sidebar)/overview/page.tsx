"use client";

import { useContext, useState } from "react";
import { useProfile } from "@/components/contexts/profile-context";
import { UIConstants, Constants } from "@workspace/common-models";
import { checkPermission } from "@workspace/utils";
import {
  DASHBOARD_PAGE_HEADER,
  OVERVIEW_HEADER,
  UNNAMED_USER,
} from "@/lib/ui/config/strings";
import { useActivities } from "@/hooks/use-activities";
import dynamic from "next/dynamic";
import DashboardContent from "@/components/admin/dashboard-content";
import { useSiteInfo } from "@/components/contexts/site-info-context";
import { TIME_RANGES } from "@/lib/ui/config/constants";
import { useTranslation } from "react-i18next";

const LoadingScreen = dynamic(
  () => import("@/components/admin/loading-screen"),
);
const MetricCard = dynamic(
  () => import("../products/[id]/_components/metric-card"),
);
const SalesCard = dynamic(() => import("./sales-card"));

// Dynamically import UI components
const Select = dynamic(() =>
  import("@workspace/ui/components/select").then((mod) => ({
    default: mod.Select,
  })),
);
const SelectContent = dynamic(() =>
  import("@workspace/ui/components/select").then((mod) => ({
    default: mod.SelectContent,
  })),
);
const SelectItem = dynamic(() =>
  import("@workspace/ui/components/select").then((mod) => ({
    default: mod.SelectItem,
  })),
);
const SelectTrigger = dynamic(() =>
  import("@workspace/ui/components/select").then((mod) => ({
    default: mod.SelectTrigger,
  })),
);
const SelectValue = dynamic(() =>
  import("@workspace/ui/components/select").then((mod) => ({
    default: mod.SelectValue,
  })),
);

// Dynamically import icons
const DollarSign = dynamic(() =>
  import("lucide-react").then((mod) => ({ default: mod.DollarSign })),
);
const UserPlus = dynamic(() =>
  import("lucide-react").then((mod) => ({ default: mod.UserPlus })),
);
const Users = dynamic(() =>
  import("lucide-react").then((mod) => ({ default: mod.Users })),
);
const Mail = dynamic(() =>
  import("lucide-react").then((mod) => ({ default: mod.Mail })),
);
const breadcrumbs = [{ label: OVERVIEW_HEADER, href: "#" }];

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const { siteInfo } = useSiteInfo();
  const { profile } = useProfile();
  const [timeRange, setTimeRange] = useState("7d");
  const { data: salesData, loading: salesLoading } = useActivities(
    Constants.ActivityType.PURCHASED,
    timeRange,
    undefined,
    true,
  );

  if (
    !checkPermission(profile.permissions!, [
      UIConstants.permissions.manageAnyCourse,
      UIConstants.permissions.manageCourse,
      UIConstants.permissions.manageMedia,
      UIConstants.permissions.manageSettings,
      UIConstants.permissions.manageSite,
      UIConstants.permissions.manageUsers,
    ])
  ) {
    return <LoadingScreen />;
  }

  const breadcrumbs = [{ label: t("overview.title"), href: "#" }];

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold mb-4">
          {t("common:dashboard.welcome")},{" "}
          {profile.name ? profile.name.split(" ")[0] : t("common:dashboard.unnamed_user")}
        </h1>
        <div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("overview.select_time_range")} />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {t(`overview.time_ranges.${range.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* <h1 className="text-4xl font-semibold mb-8">
                {DASHBOARD_PAGE_HEADER}, {profile.name ? profile.name.split(" ")[0] : ""}
            </h1>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_RANGES.map((range) => (
                                    <SelectItem
                                        key={range.value}
                                        value={range.value}
                                    >
                                        {range.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select> */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <MetricCard
          title={t("overview.sales")}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          type={Constants.ActivityType.PURCHASED}
          duration={timeRange}
        />
        <MetricCard
          title={t("overview.customers")}
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
          type={Constants.ActivityType.ENROLLED}
          duration={timeRange}
        />
        <MetricCard
          title="New community members"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          type={Constants.ActivityType.COMMUNITY_JOINED}
          duration={timeRange}
        />
        <MetricCard
          title="Subscribers"
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          type={Constants.ActivityType.NEWSLETTER_SUBSCRIBED}
          duration={timeRange}
        />
      </div>
      {/* <div className="grid xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric
                    title="Revenue"
                    type="purchased"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="Enrollments"
                    type="enrolled"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="New accounts"
                    type="user_created"
                    duration="7d"
                    address={address}
                />
                <Metric
                    title="Subscribers"
                    type="newsletter_subscribed"
                    duration="7d"
                    address={address}
                />
            </div> */}
      <SalesCard data={salesData} loading={salesLoading} />
    </DashboardContent>
  );
}
