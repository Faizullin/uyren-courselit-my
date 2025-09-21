"use client";

import { NavMain } from "@/components/admin/dashboard-skeleton/nav-main";
import { NavProjects } from "@/components/admin/dashboard-skeleton/nav-projects";
import { NavUser } from "@/components/admin/dashboard-skeleton/nav-user";
import { useProfile } from "@/components/contexts/profile-context";
import { useSiteInfo } from "@/components/contexts/site-info-context";
import { UIConstants } from "@workspace/common-models";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { checkPermission } from "@workspace/utils";
import {
  Box,
  Database,
  LibraryBig,
  MessageCircleHeart,
  Settings,
  Target,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { NavSecondary } from "./nav-secondary";
const { permissions } = UIConstants;

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation("dashboard");
  const { siteInfo } = useSiteInfo();
  const { profile } = useProfile();
  const path = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab");

  const { navMainItems, navProjectItems, navSecondaryItems } = getSidebarItems(
    profile,
    path!,
    tab!,
    t,
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src={siteInfo?.logo?.url || "/img/logo.svg"}
                    alt={siteInfo?.logo?.caption || siteInfo?.title || "Logo"}
                    width={16}
                    height={16}
                    className="w-4 h-4 object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {siteInfo.title}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={navProjectItems} />
        {navMainItems.length > 0 && <NavMain items={navMainItems} />}
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getSidebarItems(
  profile: ReturnType<typeof useProfile>["profile"],
  path: string,
  tab: string | null,
  t: (key: string) => string,
) {
  const navMainItems: any[] = [];

  if (profile) {
    if (
      checkPermission(profile.permissions!, [
        permissions.manageCourse,
        permissions.manageAnyCourse,
      ])
    ) {
      navMainItems.push({
        title: t("sidebar.overview"),
        url: "/dashboard/overview",
        icon: Target,
        isActive: path === "/dashboard/overview",
        // items: [],
      });
      navMainItems.push({
        title: t("sidebar.products"),
        url: "/dashboard/products",
        icon: Box,
        isActive:
          path === "/dashboard/products" ||
          path.startsWith("/dashboard/product"),
        items: [],
      });
      navMainItems.push({
        title: t("sidebar.lms"),
        url: "/dashboard/lms",
        icon: LibraryBig,
        isActive: path.startsWith("/dashboard/lms"),
        items: [
          {
            title: t("lms.modules.quizzes.title"),
            url: "/dashboard/lms/quizzes",
            isActive: path === "/dashboard/lms/quizzes",
          },
          {
            title: t("lms.modules.reviews.title"),
            url: "/dashboard/lms/reviews",
            isActive: path === "/dashboard/lms/reviews",
          },
          {
            title: t("lms.modules.assignments.title"),
            url: "/dashboard/lms/assignments",
            isActive: path === "/dashboard/lms/assignments",
          },
          {
            title: t("lms.modules.themes.title"),
            url: "/dashboard/lms/themes",
            isActive: path === "/dashboard/lms/themes",
          },
        ],
      });
    }
    if (checkPermission(profile.permissions!, [permissions.manageCommunity])) {
      navMainItems.push({
        title: t("sidebar.communities"),
        beta: true,
        url: "/dashboard/communities",
        icon: MessageCircleHeart,
        isActive: path === "/dashboard/communities",
        items: [],
      });
    }

    if (profile.permissions!.includes(permissions.manageUsers)) {
      navMainItems.push({
        title: t("sidebar.users"),
        url: "#",
        icon: Users,
        isActive: path?.startsWith("/dashboard/users"),
        items: [
          {
            title: t("sidebar.all_users"),
            url: "/dashboard/users",
            isActive: path === "/dashboard/users",
          },
        ],
      });
    }
    if (profile.permissions!.includes(permissions.manageSettings)) {
      const items = [
        {
          title: t("sidebar.branding"),
          url: "/dashboard/settings?tab=Branding",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Branding",
        },
        {
          title: t("sidebar.payment"),
          url: "/dashboard/settings?tab=Payment",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Payment",
        },
        {
          title: t("sidebar.mails"),
          url: "/dashboard/settings?tab=Mails",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Mails",
        },
        {
          title: t("sidebar.code_injection"),
          url: "/dashboard/settings?tab=Code%20Injection",
          isActive:
            `${path}?tab=${tab}` === "/dashboard/settings?tab=Code Injection",
        },
        {
          title: t("sidebar.api_keys"),
          url: "/dashboard/settings?tab=API%20Keys",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=API Keys",
        },
        {
          title: t("sidebar.website_settings"),
          url: "/dashboard/settings/website-settings",
          isActive: path === "/dashboard/settings/website-settings",
        },
      ];

      // Add Schools section for admin users
      if (profile.roles && profile.roles.includes("admin")) {
        items.push({
          title: t("sidebar.schools"),
          url: "/dashboard/settings/schools",
          isActive: path === "/dashboard/settings/schools",
        });
      }
      navMainItems.push({
        title: t("sidebar.settings"),
        url: "#",
        icon: Settings,
        isActive: path?.startsWith("/dashboard/settings"),
        items,
      });
    }
  }

  const navSecondaryItems = [
    {
      title: t("sidebar.my_progress"),
      url: "/dashboard/my-progress",
      icon: Target,
      isActive: path === "/dashboard/my-progress",
    },
  ];
  const navProjectItems = [
    {
      name: t("sidebar.my_content"),
      url: "/dashboard/my-content",
      icon: LibraryBig,
      isActive: path === "/dashboard/my-content",
    },
  ];

  // Add Studio section for admin users only
  if (profile.roles && profile.roles.includes("admin")) {
    navMainItems.push({
      title: t("sidebar.studio"),
      url: "/dashboard/studio",
      icon: Database,
      isActive: path.startsWith("/dashboard/studio"),
      items: [],
    });
  }

  return {
    navMainItems,
    navProjectItems,
    navSecondaryItems,
  };
}
