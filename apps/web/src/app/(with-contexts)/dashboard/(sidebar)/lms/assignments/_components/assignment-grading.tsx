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
import { Progress } from "@workspace/ui/components/progress";
import { CheckCircle, Clock, Settings, Star, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAssignmentContext } from "./assignment-context";
import { toast } from "sonner";
import { useSiteInfo } from "@/components/contexts/site-info-context";

export default function AssignmentGrading() {
  const { loadDetailQuery } = useAssignmentContext();
  const assignment = loadDetailQuery.data;
  const { t } = useTranslation(["dashboard", "common"]);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingLabel, setGradingLabel] = useState("");
  const [gradingStep, setGradingStep] = useState("");
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [gradingMetrics, setGradingMetrics] = useState<any>(null);
  const [totalFilesProcessed, setTotalFilesProcessed] = useState(0);
  const { siteInfo } = useSiteInfo();

  const loadSubmissionsQuery =
    trpc.lmsModule.assignmentModule.assignmentSubmission.listForAssignment.useQuery(
      {
        assignmentId: assignment?._id || "",
        not_graded: true,
      },
      {
        enabled: !!assignment?._id,
      }
    );

  const submissions = loadSubmissionsQuery.data?.items || [];
  const pendingCount = submissions.length;
  const handleAutoGrade = useCallback(async () => {
    if (!assignment?._id) return;

    setIsGrading(true);
    setGradingProgress(0);
    setGradingLabel("");
    setGradingStep("");
    setAgentRunId(null);
    setGradingMetrics(null);
    setTotalFilesProcessed(0);

    try {
      const response = await fetch("/api/services/ai/chat/autograder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment._id }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response reader");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.error) {
              toast.error(data.error);
              setGradingProgress(0);
              setGradingLabel("");
              setGradingStep("");
            } else if (data.type === "progress") {
              setGradingStep(data.step);
              setGradingProgress(data.progress);
              setGradingLabel(data.label);
              if (data.agentRunId) setAgentRunId(data.agentRunId);
              console.log(`[AUTOGRADER] ${data.label}: ${data.step}`);
            } else if (data.type === "submission_graded") {
              if (data.filesProcessed) {
                setTotalFilesProcessed(prev => prev + data.filesProcessed);
              }
              console.log(`[AUTOGRADER] Graded submission ${data.submissionId}: ${data.grade} (${data.filesProcessed || 0} files)`);
            } else if (data.type === "submission_error") {
              console.error(`[AUTOGRADER] Error grading ${data.submissionId}:`, data.error);
            } else if (data.type === "complete") {
              setGradingStep(data.step);
              setGradingProgress(data.progress);
              setGradingLabel(data.label);
              setGradingMetrics(data.metrics);
              if (data.agentRunId) setAgentRunId(data.agentRunId);
              
              toast.success(`Graded ${data.metrics.succeeded} submissions in ${(data.metrics.duration / 1000).toFixed(1)}s`);
              loadSubmissionsQuery.refetch();
              console.log("[AUTOGRADER] Complete:", data.metrics);
            }
          } catch (parseError) {
            console.error("[AUTOGRADER] Parse error:", parseError);
          }
        }
      }

    } catch (error) {
      console.error("[AUTOGRADER] Error:", error);
      toast.error("Failed to auto-grade submissions");
      setGradingProgress(0);
      setGradingLabel("");
      setGradingStep("");
    } finally {
      setIsGrading(false);
    }
  }, [assignment?._id, loadSubmissionsQuery]);

  const handleRevert = useCallback(async () => {
    if (!agentRunId) return;

    const { revertAgentRun } = await import("@/server/actions/agent-run");
    
    try {
      const result = await revertAgentRun(agentRunId);
      
      if (result.success) {
        toast.success("Grading reverted successfully");
        setAgentRunId(null);
        setGradingMetrics(null);
        setGradingProgress(0);
        setGradingLabel("");
        setGradingStep("");
        loadSubmissionsQuery.refetch();
      } else {
        toast.error(result.error || "Failed to revert grading");
      }
    } catch (error) {
      console.error("[REVERT] Error:", error);
      toast.error("Failed to revert grading");
    }
  }, [agentRunId, loadSubmissionsQuery]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("dashboard:lms.assignment.grading.overview")}</CardTitle>
          {
            siteInfo.aiHelper.enabled && (
              <Button
                onClick={handleAutoGrade}
                disabled={isGrading || pendingCount === 0}
                variant="default"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-Grade {pendingCount} Submissions
                  </>
                )}
              </Button>
              )
          }
        </CardHeader>
        <CardContent>

          {(isGrading || gradingMetrics) && (
            <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {gradingProgress === 100 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  )}
                  <span className="font-medium">{gradingLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground">{gradingProgress}%</span>
              </div>
              <Progress value={gradingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{gradingStep}</p>
              
              {gradingMetrics && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t">
                    <div className="p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="text-muted-foreground mb-1">Succeeded</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">{gradingMetrics.succeeded}</div>
                    </div>
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <div className="text-muted-foreground mb-1">Failed</div>
                      <div className="text-lg font-semibold text-red-600 dark:text-red-400">{gradingMetrics.failed}</div>
                    </div>
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="text-muted-foreground mb-1">Duration</div>
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{(gradingMetrics.duration / 1000).toFixed(1)}s</div>
                    </div>
                    <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                      <div className="text-muted-foreground mb-1">Tokens</div>
                      <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">{gradingMetrics.tokens?.total || 0}</div>
                    </div>
                  </div>
                  {totalFilesProcessed > 0 && (
                    <div className="text-xs text-muted-foreground pt-2">
                      Processed {totalFilesProcessed} attached files (PDF, DOCX, code files)
                    </div>
                  )}
                  <div className="flex justify-end pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevert}
                      disabled={!agentRunId}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Revert Grading
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard:lms.assignment.grading.configuration")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
