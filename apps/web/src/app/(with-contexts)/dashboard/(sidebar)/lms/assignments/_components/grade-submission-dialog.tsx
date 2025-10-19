"use client";

import { trpc } from "@/utils/trpc";
import { FormDialog, NiceModal, NiceModalHocProps, useToast } from "@workspace/components-library";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
          title: "Success",
          description: "Submission graded successfully",
        });
        onSuccess();
        resolve({ reason: "submit" });
        hide();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleSubmit = useCallback(async () => {
    const scoreValue = parseFloat(score);
    if (isNaN(scoreValue) || scoreValue < 0) {
      toast({
        title: "Invalid Score",
        description: "Please enter a valid score",
        variant: "destructive",
      });
      return;
    }

    if (scoreValue > maxPoints) {
      toast({
        title: "Invalid Score",
        description: `Score cannot exceed ${maxPoints} points`,
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
  }, [score, feedback, maxPoints, submissionId, gradeMutation, toast]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          resolve({ reason: "cancel" });
          hide();
        }
      }}
      title="Grade Submission"
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
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      ) : !submission ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Submission not found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Submission Content */}
          <div className="space-y-2">
            <Label>Submission Content</Label>
            <div className="p-4 border rounded-md bg-muted/50 max-h-60 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {submission.content || "No content provided"}
              </p>
            </div>
          </div>

          {/* Attachments */}
          {submission.attachments && submission.attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="space-y-1">
                {submission.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 border rounded"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">Attachment {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Info */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">
                {format(new Date(submission.submittedAt), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attempt</p>
              <p className="text-sm font-medium">#{submission.attemptNumber}</p>
            </div>
          </div>

          {/* Grading Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="score">Score * (Max: {maxPoints} points)</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={maxPoints}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback to the student..."
              />
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
});
