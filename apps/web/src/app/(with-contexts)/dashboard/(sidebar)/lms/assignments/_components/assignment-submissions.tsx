"use client";

import { GeneralRouterOutputs } from "@/server/api/types";
import { trpc } from "@/utils/trpc";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { NiceModal } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { FileText, Star } from "lucide-react";
import { useCallback } from "react";
import { useAssignmentContext } from "./assignment-context";
import { format } from "date-fns";
import { GradeSubmissionDialog } from "./grade-submission-dialog";

type SubmissionType =
  GeneralRouterOutputs["lmsModule"]["assignmentModule"]["assignmentSubmission"]["listForAssignment"][number];

export default function AssignmentSubmissions() {
  const { assignment } = useAssignmentContext();

  const loadSubmissionsQuery =
    trpc.lmsModule.assignmentModule.assignmentSubmission.listForAssignment.useQuery(
      {
        assignmentId: assignment?._id || "",
      },
      {
        enabled: !!assignment?._id,
      }
    );

  const submissions = loadSubmissionsQuery.data || [];

  const handleGradeSubmission = useCallback(
    async (submissionId: string) => {
      await NiceModal.show(GradeSubmissionDialog, {
        submissionId,
        maxPoints: assignment?.totalPoints || 100,
        onSuccess: () => loadSubmissionsQuery.refetch(),
      });
    },
    [assignment?.totalPoints, loadSubmissionsQuery]
  );

  const getStatusBadge = (submission: SubmissionType) => {
    switch (submission.status) {
      case AssignmentSubmissionStatusEnum.GRADED:
        return <Badge variant="default">Graded</Badge>;
      case AssignmentSubmissionStatusEnum.LATE:
        return <Badge variant="destructive">Late</Badge>;
      case AssignmentSubmissionStatusEnum.SUBMITTED:
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loadSubmissionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm text-muted-foreground">
                Submissions will appear here when students submit their work
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {submission.student?.fullName ||
                            submission.student?.username ||
                            "Unknown Student"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {submission.student?.email || ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(
                          new Date(submission.submittedAt),
                          "MMM dd, yyyy"
                        )}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(submission.submittedAt), "HH:mm")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(submission)}</TableCell>
                    <TableCell>
                      {submission.score !== null &&
                      submission.score !== undefined ? (
                        <div className="font-medium">
                          {submission.score}/{assignment?.totalPoints || 0}
                          <span className="text-xs text-muted-foreground ml-1">
                            (
                            {assignment?.totalPoints
                              ? Math.round(
                                  (submission.score / assignment.totalPoints) *
                                    100
                                )
                              : 0}
                            %)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not graded</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGradeSubmission(submission._id as string)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {submission.score !== null &&
                        submission.score !== undefined
                          ? "Edit Grade"
                          : "Grade"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  );
}
