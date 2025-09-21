"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import LoadingScreen from "@/components/admin/loading-screen";
import { useProfile } from "@/components/contexts/profile-context";
import {
  TOAST_TITLE_ERROR
} from "@/lib/ui/config/strings";
import { formattedLocaleDate } from "@/lib/ui/lib/utils";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { Constants, UIConstants } from "@workspace/common-models";
import { TableBody, useToast } from "@workspace/components-library";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { checkPermission } from "@workspace/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const { permissions } = UIConstants;

type UserItemType =
  GeneralRouterOutputs["userModule"]["user"]["list"]["items"][number];

export default function UsersHub() {
  const { t } = useTranslation(["dashboard", "common"]);
  const breadcrumbs = [{ label: t("sidebar.users"), href: "#" }];
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, _] = useState(10);
  const [users, setUsers] = useState<UserItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [count, setCount] = useState(0);
  const { toast } = useToast();

  const { profile } = useProfile();

  // Use tRPC query instead of GraphQL
  const {
    data: usersData,
    isLoading,
    error,
  } = trpc.userModule.user.list.useQuery({
    pagination: {
      skip: (page - 1) * rowsPerPage,
      take: rowsPerPage,
    },
    search: {
      q: searchQuery || undefined,
    },
  });

  // Update local state when tRPC data changes
  useEffect(() => {
    if (usersData) {
      setUsers(usersData.items || []);
      setCount(usersData.total || 0);
      setLoading(false);
    }
  }, [usersData]);

  // Handle loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: TOAST_TITLE_ERROR,
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle search query changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page when searching
  }, []);

  const getUserNamePreview = useCallback((user?: UserItemType) => {
    if (!user?.name) return "";
    return (
      user.name ? user.name.charAt(0) : user.email.charAt(0)
    ).toUpperCase();
  }, []);

  if (!checkPermission(profile.permissions!, [permissions.manageUsers])) {
    return <LoadingScreen />;
  }

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-semibold mb-4">
          {t("sidebar.users")}
        </h1>
      </div>
      <div className="w-full mt-4 space-y-8">
        <div className="mb-4">
          <Input
            placeholder={t("users.search_placeholder")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">
                {t("users.table.name")}
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                {t("users.table.status")}
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                {t("users.table.products")}
              </TableHead>
              <TableHead className="text-muted-foreground font-medium">
                {t("users.table.communities")}
              </TableHead>
              <TableHead
                align="right"
                className="text-muted-foreground font-medium hidden lg:table-cell"
              >
                {t("users.table.joined")}
              </TableHead>
              <TableHead
                align="right"
                className="text-muted-foreground font-medium hidden lg:table-cell"
              >
                {t("users.table.last_active")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-5 w-[200px]" />
                            <Skeleton className="h-3.5 w-[150px]" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-[100px] ml-auto" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-[100px] ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
              : users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage
                            src={
                              user.avatar
                                ? user.avatar.url
                                : "/courselit_backdrop_square.webp"
                            }
                          />
                          <AvatarFallback>
                            {getUserNamePreview(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/dashboard/users/${user.userId}`}>
                            <span className="font-medium text-base">
                              {user.name ? user.name : user.email}
                            </span>
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Active" : "Restricted"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {
                        user.content.filter(
                          (content: any) =>
                            content.entityType.toLowerCase() ===
                            Constants.MembershipEntityType.COURSE,
                        ).length
                      }
                    </TableCell>
                    <TableCell>
                      {
                        user.content.filter(
                          (content: any) =>
                            content.entityType.toLowerCase() ===
                            Constants.MembershipEntityType.COMMUNITY,
                        ).length
                      }
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.createdAt
                        ? formattedLocaleDate(user.createdAt)
                        : ""}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.updatedAt !== user.createdAt
                        ? user.updatedAt
                          ? formattedLocaleDate(user.updatedAt)
                          : ""
                        : ""}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </DashboardContent>
  );
}
