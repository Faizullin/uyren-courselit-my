"use client";

import { NavMain } from "@/components/admin/dashboard-skeleton/nav-main";
import { NavProjects } from "@/components/admin/dashboard-skeleton/nav-projects";
import { NavUser } from "@/components/admin/dashboard-skeleton/nav-user";
import { useProfile } from "@/components/contexts/profile-context";
import { useSiteInfo } from "@/components/contexts/site-info-context";
import {
  MY_CONTENT_HEADER,
  SIDEBAR_MENU_SETTINGS,
  SIDEBAR_MENU_USERS
} from "@/lib/ui/config/strings";
import { UIConstants } from "@workspace/common-models";
import { Image } from "@workspace/components-library";
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
  Globe,
  LibraryBig,
  LifeBuoy,
  Mail,
  MessageCircleHeart,
  Settings,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ComponentProps } from "react";
import { NavSecondary } from "./nav-secondary";
const { permissions } = UIConstants;

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { siteInfo } = useSiteInfo();
  const { profile } = useProfile();
  const path = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab");

  const { navMainItems, navProjectItems, navSecondaryItems } = getSidebarItems(
    profile,
    path!,
    tab!,
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image
                    borderRadius={1}
                    src={siteInfo.logo?.url || ""}
                    width="w-[16px]"
                    height="h-[16px]"
                    alt="logo"
                  />
                </div>
                {/* <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div> */}
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
        title: "Overview",
        url: "/dashboard/overview",
        icon: Target,
        isActive: path === "/dashboard/overview",
        // items: [],
      });
      navMainItems.push({
        title: "Products",
        url: "/dashboard/products",
        icon: Box,
        isActive:
          path === "/dashboard/products" ||
          path.startsWith("/dashboard/product"),
        items: [],
      });
      navMainItems.push({
        title: "LMS",
        url: "/dashboard/lms",
        icon: LibraryBig,
        isActive: path.startsWith("/dashboard/lms"),
        items: [
          {
            title: "Quizzes",
            url: "/dashboard/lms/quizzes",
            isActive: path === "/dashboard/lms/quizzes",
          },
          {
            title: "Reviews",
            url: "/dashboard/lms/reviews",
            isActive: path === "/dashboard/lms/reviews",
          },
          {
            title: "Assignments",
            url: "/dashboard/lms/assignments",
            isActive: path === "/dashboard/lms/assignments",
          },
          {
            title: "Themes",
            url: "/dashboard/lms/themes",
            isActive: path === "/dashboard/lms/themes",
          },
        ],
      });
    }
    if (checkPermission(profile.permissions!, [permissions.manageCommunity])) {
      navMainItems.push({
        title: "Communities",
        beta: true,
        url: "/dashboard/communities",
        icon: MessageCircleHeart,
        isActive: path === "/dashboard/communities",
        items: [],
      });
    }

    if (profile.permissions!.includes(permissions.manageUsers)) {
      navMainItems.push({
        title: SIDEBAR_MENU_USERS,
        url: "#",
        icon: Users,
        isActive: path?.startsWith("/dashboard/users"),
        items: [
          {
            title: "All users",
            url: "/dashboard/users",
            isActive: path === "/dashboard/users",
          },
        ],
      });
      // navMainItems.push({
      //   title: SIDEBAR_MENU_MAILS,
      //   beta: true,
      //   url: "#",
      //   icon: Mail,
      //   isActive:
      //     path.startsWith("/dashboard/mails") ||
      //     path.startsWith("/dashboard/mail"),
      //   items: [
      //     {
      //       title: "Broadcasts",
      //       url: "/dashboard/mails?tab=Broadcasts",
      //       isActive:
      //         `${path}?tab=${tab}` === "/dashboard/mails?tab=Broadcasts",
      //     },
      //     {
      //       title: "Sequences",
      //       url: "/dashboard/mails?tab=Sequences",
      //       isActive: `${path}?tab=${tab}` === "/dashboard/mails?tab=Sequences",
      //     },
      //   ],
      // });
    }
    if (profile.permissions!.includes(permissions.manageSettings)) {
      const items = [
        {
          title: "Branding",
          url: "/dashboard/settings?tab=Branding",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Branding",
        },
        {
          title: "Payment",
          url: "/dashboard/settings?tab=Payment",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Payment",
        },
        {
          title: "Mails",
          url: "/dashboard/settings?tab=Mails",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=Mails",
        },
        {
          title: "Code injection",
          url: "/dashboard/settings?tab=Code%20Injection",
          isActive:
            `${path}?tab=${tab}` === "/dashboard/settings?tab=Code Injection",
        },
        {
          title: "API Keys",
          url: "/dashboard/settings?tab=API%20Keys",
          isActive: `${path}?tab=${tab}` === "/dashboard/settings?tab=API Keys",
        },
        {
          title: "Website Settings",
          url: "/dashboard/settings/website-settings",
          isActive: path === "/dashboard/settings/website-settings",
        },
      ];

      // Add Schools section for admin users
      if (profile.roles && profile.roles.includes("admin")) {
        items.push({
          title: "Schools",
          url: "/dashboard/settings/schools",
          isActive: path === "/dashboard/settings/schools",
        });
      }
      navMainItems.push({
        title: SIDEBAR_MENU_SETTINGS,
        url: "#",
        icon: Settings,
        isActive: path?.startsWith("/dashboard/settings"),
        items,
      });
    }
  }

  const navSecondaryItems = [
    {
      title: "Support",
      url: "/dashboard/support",
      icon: LifeBuoy,
      isActive: path === "/dashboard/support",
    },
  ];
  const navProjectItems = [
    {
      name: MY_CONTENT_HEADER,
      url: "/dashboard/my-content",
      icon: LibraryBig,
      isActive: path === "/dashboard/my-content",
    },
    ...(profile?.permissions?.includes(permissions.enrollInCourse)
      ? [
        {
          name: "My Progress",
          url: "/dashboard/my-progress",
          icon: Target,
          isActive: path === "/dashboard/my-progress",
        } as any,
      ]
      : []),
  ];



  // Add Studio section for admin users only
  if (profile.roles && profile.roles.includes("admin")) {
    navMainItems.push({
      title: "Studio",
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
