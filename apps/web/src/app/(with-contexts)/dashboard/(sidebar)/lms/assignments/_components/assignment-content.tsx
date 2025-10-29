"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { PublicationStatusEnum } from "@workspace/common-logic/lib/publication_status";
import { useToast } from "@workspace/components-library";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAssignmentContext } from "./assignment-context";
import AssignmentGrading from "./assignment-grading";
import AssignmentSettings from "./assignment-settings";
import AssignmentSubmissions from "./assignment-submissions";

export default function AssignmentContent() {
  const { mode, loadDetailQuery, updateMutation } = useAssignmentContext();
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();

  const assignment = loadDetailQuery.data;

  const breadcrumbs = useMemo(
    () => [
      {
        label: t("dashboard:lms.modules.assignments.title"),
        href: "/dashboard/lms/assignments",
      },
      {
        label: mode === "create" ? t("dashboard:lms.assignment.new_assignment") : t("dashboard:lms.assignment.edit_assignment"),
        href: "#",
      },
    ],
    [mode, t],
  );

  const handleStatusChange = useCallback(
    async (newStatus: PublicationStatusEnum) => {
      if (!assignment?._id) return;

      await updateMutation.mutateAsync({
        id: assignment._id,
        data: { publicationStatus: newStatus },
      });
    },
    [assignment?._id, updateMutation],
  );

  const pulicationStatusLabel = useMemo(() => {
    const data = {
      [PublicationStatusEnum.DRAFT]: t("dashboard:table.draft"),
      [PublicationStatusEnum.PUBLISHED]: t("dashboard:table.published"),
      [PublicationStatusEnum.ARCHIVED]: t("dashboard:table.archived"),
    }
    return data[assignment?.publicationStatus as PublicationStatusEnum] || t("dashboard:table.draft");
  }, [assignment?.publicationStatus, t]);

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <HeaderTopbar
        backLink={true}
        header={{
          title: mode === "create" ? t("dashboard:lms.assignment.new_assignment") : t("dashboard:lms.assignment.edit_assignment"),
          subtitle:
            mode === "create"
              ? t("dashboard:lms.assignment.create_subtitle")
              : t("dashboard:lms.assignment.edit_subtitle"),
        }}
        rightAction={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={
                    !assignment ||
                    updateMutation.isPending ||
                    mode === "create"
                  }
                  className="flex items-center gap-2"
                >
                  {pulicationStatusLabel}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange(PublicationStatusEnum.DRAFT)
                  }
                  disabled={assignment?.publicationStatus === PublicationStatusEnum.DRAFT}
                >
                  {t("dashboard:table.draft")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange(
                      PublicationStatusEnum.PUBLISHED,
                    )
                  }
                  disabled={assignment?.publicationStatus === PublicationStatusEnum.PUBLISHED}
                >
                  {t("dashboard:table.published")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    handleStatusChange(PublicationStatusEnum.ARCHIVED)
                  }
                  disabled={assignment?.publicationStatus === PublicationStatusEnum.ARCHIVED}
                >
                  {t("dashboard:table.archived")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">{t("dashboard:lms.assignment.tabs.basic_information")}</TabsTrigger>
          <TabsTrigger value="submissions" disabled={mode === "create"}>
            {t("dashboard:lms.assignment.tabs.submissions")}
          </TabsTrigger>
          <TabsTrigger value="grading" disabled={mode === "create"}>
            {t("dashboard:lms.assignment.tabs.grading")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <AssignmentSettings />
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          {mode === "edit" ? (
            <AssignmentSubmissions />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("dashboard:lms.assignment.messages.save_first_submissions")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grading" className="space-y-6">
          {mode === "edit" ? (
            <AssignmentGrading />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("dashboard:lms.assignment.messages.save_first_grading")}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardContent>
  );
}
