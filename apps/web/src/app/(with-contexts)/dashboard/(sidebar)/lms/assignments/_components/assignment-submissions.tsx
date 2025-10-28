"use client";

import { DataTable } from "@workspace/components-library/";
import { DataTableToolbar } from "@workspace/components-library";
import { useDataTable } from "@workspace/components-library";
import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { ColumnDef } from "@tanstack/react-table";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { DeleteConfirmNiceDialog, NiceModal, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Calendar, FileText, MoreHorizontal, Star, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAssignmentContext } from "./assignment-context";
import { format } from "date-fns";
import { GradeSubmissionDialog } from "./grade-submission-dialog";

type SubmissionType =
  GeneralRouterOutputs["lmsModule"]["assignmentModule"]["assignmentSubmission"]["listForAssignment"]["items"][number];

export default function AssignmentSubmissions() {
  const { loadDetailQuery } = useAssignmentContext();
  const { t } = useTranslation(["dashboard", "common"]);
  const [parsedData, setParsedData] = useState<SubmissionType[]>([]);
  const [parsedPagination, setParsedPagination] = useState({ pageCount: 0 });

  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();

  const deleteSubmissionMutation =
    trpc.lmsModule.assignmentModule.assignmentSubmission.delete.useMutation({
      onSuccess: () => {
        trpcUtils.lmsModule.assignmentModule.assignmentSubmission.listForAssignment.invalidate();
        toast({
          title: t("dashboard:lms.assignment.submissions.submission_deleted"),
          description: t("dashboard:lms.assignment.submissions.submission_deleted_desc"),
        });
      },
    });

  const handleGradeSubmission = useCallback(
    async (submissionId: string) => {
      await NiceModal.show(GradeSubmissionDialog, {
        submissionId,
        maxPoints: loadDetailQuery.data?.totalPoints || 100,
        onSuccess: () => {
          trpcUtils.lmsModule.assignmentModule.assignmentSubmission.listForAssignment.invalidate();
        },
      });
    },
    [loadDetailQuery.data?.totalPoints, trpcUtils]
  );

  const handleDeleteSubmission = useCallback(
    (submission: SubmissionType) => {
      NiceModal.show(DeleteConfirmNiceDialog, {
        message: `Are you sure you want to delete the submission for "${submission.student?.fullName || submission.student?.email || t("common:unknown_student")}"? This action cannot be undone.`,
        data: submission,
      }).then((result) => {
        if (result.reason === "confirm") {
          const obj = result.data as SubmissionType;
          deleteSubmissionMutation.mutate({
            id: obj._id,
          });
        }
      });
    },
    [t, deleteSubmissionMutation]
  );

  const columns: ColumnDef<SubmissionType>[] = useMemo(() => {
    return [
      {
        accessorKey: "student",
        header: t("dashboard:lms.assignment.submissions.student"),
        cell: ({ row }) => {
          const submission = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium">
                  {submission.student?.fullName ||
                    submission.student?.username ||
                    t("common:unknown_student")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {submission.student?.email || "No email"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "submittedAt",
        header: t("dashboard:lms.assignment.submissions.submitted"),
        cell: ({ row }) => {
          const date = row.original.submittedAt;
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm">
                  {format(new Date(date), "MMM dd, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(date), "HH:mm")}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("common:status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const getStatusVariant = (status: AssignmentSubmissionStatusEnum) => {
            switch (status) {
              case AssignmentSubmissionStatusEnum.GRADED:
                return "default";
              case AssignmentSubmissionStatusEnum.LATE:
                return "destructive";
              case AssignmentSubmissionStatusEnum.SUBMITTED:
                return "secondary";
              default:
                return "outline";
            }
          };

          const getStatusLabel = (status: AssignmentSubmissionStatusEnum) => {
            switch (status) {
              case AssignmentSubmissionStatusEnum.GRADED:
                return t("dashboard:lms.assignment.submission_status.graded");
              case AssignmentSubmissionStatusEnum.LATE:
                return t("dashboard:lms.assignment.submission_status.late");
              case AssignmentSubmissionStatusEnum.SUBMITTED:
                return t("dashboard:lms.assignment.submission_status.pending");
              default:
                return t("dashboard:lms.assignment.submission_status.draft");
            }
          };

          return (
            <Badge variant={getStatusVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          );
        },
        meta: {
          label: t("common:status"),
          variant: "select",
          options: [
            { label: "All", value: "" },
            { label: t("dashboard:lms.assignment.submission_status.graded"), value: AssignmentSubmissionStatusEnum.GRADED },
            { label: t("dashboard:lms.assignment.submission_status.late"), value: AssignmentSubmissionStatusEnum.LATE },
            { label: t("dashboard:lms.assignment.submission_status.pending"), value: AssignmentSubmissionStatusEnum.SUBMITTED },
          ],
        },
      },
      {
        accessorKey: "score",
        header: t("common:score"),
        cell: ({ row }) => {
          const submission = row.original;
          const totalPoints = loadDetailQuery.data?.totalPoints || 0;
          return submission.score !== null && submission.score !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {submission.score}/{totalPoints}
              </span>
              <Badge
                variant={
                  totalPoints > 0 && submission.score / totalPoints >= 0.7
                    ? "default"
                    : "secondary"
                }
              >
                {totalPoints > 0
                  ? `${Math.round((submission.score / totalPoints) * 100)}%`
                  : "N/A"}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {t("dashboard:lms.assignment.submissions.not_graded")}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: t("common:actions"),
        cell: ({ row }) => {
          const submission = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleGradeSubmission(submission._id as string)}>
                  <Star className="h-4 w-4 mr-2" />
                  {submission.score !== null && submission.score !== undefined
                    ? t("dashboard:lms.assignment.submissions.edit_grade")
                    : t("dashboard:lms.assignment.submissions.grade")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteSubmission(submission)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("common:delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [
    t,
    loadDetailQuery.data?.totalPoints,
    handleGradeSubmission,
    handleDeleteSubmission,
  ]);

  const { table } = useDataTable({
    columns,
    data: parsedData,
    pageCount: parsedPagination.pageCount,
    enableGlobalFilter: true,
    initialState: {
      sorting: [{ id: "submittedAt", desc: true }],
    },
  });

  const tableState = table.getState();
  const queryParams = useMemo(() => {
    const parsed: any = {
      assignmentId: loadDetailQuery.data?._id || "",
    };
    return parsed;
  }, [loadDetailQuery.data?._id]);

  const loadSubmissionsQuery =
    trpc.lmsModule.assignmentModule.assignmentSubmission.listForAssignment.useQuery(
      queryParams,
      {
        enabled: !!loadDetailQuery.data?._id,
      }
    );

  useEffect(() => {
    if (!loadSubmissionsQuery.data) return;
    const parsed = loadSubmissionsQuery.data?.items || [];
    setParsedData(parsed);
    // setParsedPagination({
    //   pageCount: Math.ceil(parsed.length / (tableState.pagination.pageSize || 20)),
    // });
  }, [loadSubmissionsQuery.data, tableState.pagination.pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{t("dashboard:lms.assignment.submissions.title")}</span>
        </div>
        {parsedData.length > 0 && (
          <Badge variant="outline">{parsedData.length} {t("dashboard:lms.assignment.submissions.title")}</Badge>
        )}
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-2">
            <DataTable table={table}>
              <DataTableToolbar table={table} />
            </DataTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
