"use client";

import { trpc } from "@/utils/trpc";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CheckCircle, Clock, Settings, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAssignmentContext } from "./assignment-context";

export default function AssignmentGrading() {
  const { assignment } = useAssignmentContext();
  const { t } = useTranslation(["dashboard", "common"]);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);

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
  const gradedCount = submissions.filter((s) => s.status === AssignmentSubmissionStatusEnum.GRADED).length;
  const pendingCount = submissions.filter(
    (s) => s.status === AssignmentSubmissionStatusEnum.SUBMITTED
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard:lms.assignment.grading.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{gradedCount}</div>
                <div className="text-sm text-muted-foreground">{t("dashboard:lms.assignment.grading.graded")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">{t("dashboard:lms.assignment.grading.pending")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Star className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {assignment?.totalPoints || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("dashboard:lms.assignment.grading.total_points")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard:lms.assignment.grading.configuration")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{t("dashboard:lms.assignment.grading.rubric")}</div>
                <div className="text-sm text-muted-foreground">
                  {assignment?.rubrics && assignment.rubrics.length > 0
                    ? t("dashboard:lms.assignment.grading.criteria_defined", { count: assignment.rubrics.length })
                    : t("dashboard:lms.assignment.grading.no_rubric")}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowRubricBuilder(!showRubricBuilder)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {assignment?.rubrics && assignment.rubrics.length > 0
                  ? t("common:edit")
                  : t("common:create")}{" "}
                {t("dashboard:lms.assignment.grading.rubric")}
              </Button>
            </div>

            {assignment?.rubrics && assignment.rubrics.length > 0 && (
              <div className="space-y-2">
                {assignment.rubrics.map((criterion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{criterion.criterion}</div>
                      {criterion.description && (
                        <div className="text-sm text-muted-foreground">
                          {criterion.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{criterion.points} {t("dashboard:lms.assignment.grading.pts")}</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{t("dashboard:lms.assignment.grading.late_submission_policy")}</div>
                <div className="text-sm text-muted-foreground">
                  {assignment?.allowLateSubmission
                    ? t("dashboard:lms.assignment.grading.late_penalty_percent", { percent: assignment.latePenalty })
                    : t("dashboard:lms.assignment.grading.late_not_allowed")}
                </div>
              </div>
              <Badge
                variant={
                  assignment?.allowLateSubmission ? "default" : "secondary"
                }
              >
                {assignment?.allowLateSubmission ? t("common:enabled") : t("common:disabled")}
              </Badge>
            </div>

            {/* <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{t("dashboard:lms.assignment.grading.peer_review")}</div>
                <div className="text-sm text-muted-foreground">
                  {assignment?.allowPeerReview
                    ? t("dashboard:lms.assignment.grading.peer_review_enabled_desc")
                    : t("dashboard:lms.assignment.grading.peer_review_not_enabled")}
                </div>
              </div>
              <Badge
                variant={
                  assignment?.allowPeerReview ? "default" : "secondary"
                }
              >
                {assignment?.peerReviewEnabled ? t("common:enabled") : t("common:disabled")}
              </Badge>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
