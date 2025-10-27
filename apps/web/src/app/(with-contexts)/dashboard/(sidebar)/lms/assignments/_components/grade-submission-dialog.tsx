"use client";

import { trpc } from "@/utils/trpc";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { FormDialog, NiceModal, NiceModalHocProps, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import { Calendar, Download, ExternalLink, FileText, Hash, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const [status, setStatus] = useState<AssignmentSubmissionStatusEnum>(AssignmentSubmissionStatusEnum.SUBMITTED);

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
      setStatus(submission.status || AssignmentSubmissionStatusEnum.SUBMITTED);
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
        status,
      },
    });
  }, [score, feedback, status, maxPoints, submissionId, gradeMutation, toast, t]);

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
      maxWidth="4xl"
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
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard:lms.assignment.submissions.student")}</p>
                <p className="text-sm font-medium">
                  {submission.student?.fullName || submission.student?.username || t("common:unknown_student")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("dashboard:lms.assignment.grade_dialog.submitted")}</p>
                <p className="text-sm font-medium">
                  {format(new Date(submission.submittedAt), "MMM dd, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(submission.submittedAt), "HH:mm")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20">
                <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("common:attempt")}</p>
                <p className="text-sm font-medium">Attempt #{submission.attemptNumber}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">{t("dashboard:lms.assignment.grade_dialog.submission_content")}</Label>
              {submission.status && (
                <Badge variant="secondary" className="text-xs">
                  {submission.status}
                </Badge>
              )}
            </div>
            <div className="p-4 border rounded-lg bg-muted/50 max-h-80 overflow-y-auto">
              {submission.content ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {submission.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("dashboard:lms.assignment.grade_dialog.no_content")}
                </p>
              )}
            </div>
          </div>

          {submission.attachments && submission.attachments.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t("dashboard:lms.assignment.grade_dialog.attachments")} ({submission.attachments.length})
              </Label>
              <div className="grid gap-2">
                {submission.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded bg-blue-100 dark:bg-blue-900/20">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.originalFileName || attachment.file?.split('/').pop() || t("dashboard:lms.assignment.grade_dialog.attachment_number", { number: index + 1 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.mimeType || t("dashboard:lms.assignment.grade_dialog.attachment_number", { number: index + 1 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(attachment.file || '', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = attachment.file || '';
                          link.download = attachment.originalFileName || '';
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">{t("dashboard:lms.assignment.grading.overview")}</Label>
            
            <div className="space-y-2">
              <Label htmlFor="status">{t("common:status")}</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value as AssignmentSubmissionStatusEnum)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AssignmentSubmissionStatusEnum.SUBMITTED}>
                    {t("dashboard:lms.assignment.submission_status.pending")}
                  </SelectItem>
                  <SelectItem value={AssignmentSubmissionStatusEnum.GRADED}>
                    {t("dashboard:lms.assignment.submission_status.graded")}
                  </SelectItem>
                  <SelectItem value={AssignmentSubmissionStatusEnum.LATE}>
                    {t("dashboard:lms.assignment.submission_status.late")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="text-lg font-semibold"
                />
              </div>
              <div className="flex items-end">
                <div className="p-4 border rounded-lg bg-muted/30 w-full">
                  <p className="text-xs text-muted-foreground">{t("common:percentage")}</p>
                  <p className="text-2xl font-bold">
                    {score && !isNaN(parseFloat(score)) && maxPoints > 0
                      ? `${Math.round((parseFloat(score) / maxPoints) * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">{t("dashboard:lms.assignment.grade_dialog.feedback_label")}</Label>
              <Textarea
                id="feedback"
                rows={5}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t("dashboard:lms.assignment.grade_dialog.feedback_placeholder")}
                className="resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
});
