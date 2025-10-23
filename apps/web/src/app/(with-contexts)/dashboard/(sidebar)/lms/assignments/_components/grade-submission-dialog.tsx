"use client";

import { trpc } from "@/utils/trpc";
import { FormDialog, NiceModal, NiceModalHocProps, useToast } from "@workspace/components-library";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface GradeSubmissionDialogProps extends NiceModalHocProps {
  submissionId: string;
  maxPoints: number;
  onSuccess: () => void;
}

export const GradeSubmissionDialog = NiceModal.create<
  GradeSubmissionDialogProps,
  { reason: "cancel" | "submit" }
>(({ submissionId, maxPoints, onSuccess }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { t } = useTranslation(["dashboard", "common"]);
  const { toast } = useToast();
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadDetailQuery =
    trpc.lmsModule.assignmentModule.assignmentSubmission.getById.useQuery(
      {
        id: submissionId,
      },
      {
        enabled: visible && !!submissionId,
      }
    );

  const submission = loadDetailQuery.data;

  useEffect(() => {
    if (submission) {
      setScore(submission.score?.toString() || "");
      setFeedback(submission.feedback || "");
    }
  }, [submission]);

  const gradeMutation =
    trpc.lmsModule.assignmentModule.assignmentSubmission.grade.useMutation({
      onSuccess: () => {
        toast({
          title: t("common:success"),
          description: t("dashboard:lms.assignment.toast.submission_graded"),
        });
        onSuccess();
        resolve({ reason: "submit" });
        hide();
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = useCallback(async () => {
    const scoreValue = parseFloat(score);
    if (isNaN(scoreValue) || scoreValue < 0) {
      toast({
        title: t("dashboard:lms.assignment.grade_dialog.invalid_score"),
        description: t("dashboard:lms.assignment.grade_dialog.invalid_score_desc"),
        variant: "destructive",
      });
      return;
    }

    if (scoreValue > maxPoints) {
      toast({
        title: t("dashboard:lms.assignment.grade_dialog.invalid_score"),
        description: t("dashboard:lms.assignment.grade_dialog.score_exceeds", { max: maxPoints }),
        variant: "destructive",
      });
      return;
    }

    await gradeMutation.mutateAsync({
      id: submissionId,
      data: {
        score: scoreValue,
        feedback: feedback || undefined,
      },
    });
  }, [score, feedback, maxPoints, submissionId, gradeMutation, toast, t]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          resolve({ reason: "cancel" });
          hide();
        }
      }}
      title={t("dashboard:lms.assignment.grade_dialog.title")}
      description={
        submission?.student?.fullName || submission?.student?.username || ""
      }
      onSubmit={handleSubmit}
      onCancel={() => {
        resolve({ reason: "cancel" });
        hide();
      }}
      isLoading={gradeMutation.isPending}
      maxWidth="2xl"
    >
      {loadDetailQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{t("dashboard:lms.assignment.grade_dialog.loading")}</p>
        </div>
      ) : !submission ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{t("dashboard:lms.assignment.grade_dialog.not_found")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("dashboard:lms.assignment.grade_dialog.submission_content")}</Label>
            <div className="p-4 border rounded-md bg-muted/50 max-h-60 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {submission.content || t("dashboard:lms.assignment.grade_dialog.no_content")}
              </p>
            </div>
          </div>

          {submission.attachments && submission.attachments.length > 0 && (
            <div className="space-y-2">
              <Label>{t("dashboard:lms.assignment.grade_dialog.attachments")}</Label>
              <div className="space-y-1">
                {submission.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 border rounded"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{t("dashboard:lms.assignment.grade_dialog.attachment_number", { number: index + 1 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">{t("dashboard:lms.assignment.grade_dialog.submitted")}</p>
              <p className="text-sm font-medium">
                {format(new Date(submission.submittedAt), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("common:attempt")}</p>
              <p className="text-sm font-medium">#{submission.attemptNumber}</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="score">{t("dashboard:lms.assignment.grade_dialog.score_label", { max: maxPoints })}</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={maxPoints}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={t("dashboard:lms.assignment.grade_dialog.score_placeholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">{t("dashboard:lms.assignment.grade_dialog.feedback_label")}</Label>
              <Textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t("dashboard:lms.assignment.grade_dialog.feedback_placeholder")}
              />
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
});
