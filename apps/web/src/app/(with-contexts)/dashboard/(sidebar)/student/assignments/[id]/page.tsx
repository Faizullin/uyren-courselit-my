"use client";

import { AssignmentLinkSubmitForm } from "@/components/editors/tiptap/extensions/assignment-link/assignment-link-submit-form";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function Page() {
  const params = useParams();
  const assignmentId = params.id as string;
  const { t } = useTranslation(["assignment", "common"]);

  const loadAssignmentQuery = trpc.lmsModule.assignmentModule.assignment.publicGetById.useQuery({
    id: assignmentId,
  });

  const assignment = loadAssignmentQuery.data;

  const breadcrumbs = [
    { label: t("dashboard:sidebar.my_assignments"), href: "/dashboard/student/assignments" },
    { label: assignment?.title || t("common:loading"), href: "#" },
  ];

  if (loadAssignmentQuery.isLoading) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </DashboardContent>
    );
  }

  if (!assignment) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <EmptyState />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <HeaderTopbar
        header={{
          title: assignment.title,
          subtitle: assignment.description || t("assignment:submission_content"),
        }}
        backLink={true}
      />

      <AssignmentLinkSubmitForm
        creds={{
          _id: assignmentId,
          title: assignment.title,
        }}
      />
    </DashboardContent>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation(["assignment", "common"]);
  
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">
        <ClipboardList className="h-16 w-16 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("common:not_found")}</h3>
      <p className="text-muted-foreground mb-6">{t("assignment:title")} not found</p>
      <Link href="/dashboard/student/assignments">
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common:back")}
        </Button>
      </Link>
    </div>
  );
}

