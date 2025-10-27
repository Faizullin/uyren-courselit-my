"use client";

import { removeSubmissionAttachment, uploadFileAction } from "@/server/actions/assignment-submission";
import { trpc } from "@/utils/trpc";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { FormDialog, MediaUpload, useDialogControl, useToast } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, Clock, Download, FileText, Paperclip, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function LoadingScreen() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function AssignmentLinkSubmitForm({ creds }: { creds: {
  _id: string;
  title: string;
} }) {
    const { t } = useTranslation(["assignment", "common"]);
    const { toast } = useToast();
    const submitDialogControl = useDialogControl();
    const [submissionText, setSubmissionText] = useState("");
    const [uploadedAttachments, setUploadedAttachments] = useState<IAttachmentMedia[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const utils = trpc.useUtils();
    
    const loadAssignmentDetailQuery = trpc.lmsModule.assignmentModule.assignment.publicGetById.useQuery({
        id: creds._id,
    });
    const loadAssignmentSubmissionQuery = trpc.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.useQuery({
      assignmentId: creds._id,
    });

    const saveDraftMutation = trpc.lmsModule.assignmentModule.assignmentSubmission.saveDraft.useMutation({
      onSuccess: () => {
        toast({
          title: t("common:success"),
          description: t("assignment:draft_saved"),
        });
        utils.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.invalidate();
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message || t("assignment:save_failed"),
          variant: "destructive",
        });
      },
    });

    const submitMutation = trpc.lmsModule.assignmentModule.assignmentSubmission.submitAssignment.useMutation({
      onSuccess: () => {
        toast({
          title: t("common:success"),
          description: t("assignment:submission_success"),
        });
        submitDialogControl.hide();
        setIsEditMode(false);
        utils.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.invalidate();
        setSubmissionText("");
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message || t("assignment:submission_failed"),
          variant: "destructive",
        });
      },
    });

    const resubmitMutation = trpc.lmsModule.assignmentModule.assignmentSubmission.resubmit.useMutation({
      onSuccess: async () => {
        setIsEditMode(true);
        await utils.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.invalidate();
        toast({
          title: t("common:success"),
          description: t("assignment:resubmit_mode_enabled"),
        });
      },
      onError: (error) => {
        toast({
          title: t("common:error"),
          description: error.message || t("common:error"),
          variant: "destructive",
        });
      },
    });
    
    const assignment = loadAssignmentDetailQuery.data;
    const submission = loadAssignmentSubmissionQuery.data;
    
    const currentAttemptNumber = submission?.attemptNumber || 0;
    const submittedCount = submission?.status !== AssignmentSubmissionStatusEnum.DRAFT ? currentAttemptNumber : 0;
    const nextAttemptNumber = submission?.status === AssignmentSubmissionStatusEnum.DRAFT ? currentAttemptNumber + 1 : currentAttemptNumber;
    const attemptsLeft = assignment?.maxAttempts ? assignment.maxAttempts - currentAttemptNumber : null;
    const canResubmit = !assignment?.maxAttempts || (attemptsLeft !== null && attemptsLeft > 0);
    
    useEffect(() => {
      if (submission?.status === AssignmentSubmissionStatusEnum.DRAFT) {
        setSubmissionText(submission.content || "");
        setUploadedAttachments((submission.attachments as unknown as IAttachmentMedia[]) || []);
      } else if (submission) {
        setUploadedAttachments([]);
      }
    }, [submission]);
    
    const handleEnterEditMode = () => {
      if (!submission || !assignment) return;
      resubmitMutation.mutate({ assignmentId: creds._id });
    };
    
    const handleCancelEdit = () => {
      setIsEditMode(false);
      setSubmissionText("");
    };
    
    const handleFileUpload = async (file: File) => {
      let submissionId = submission?._id;
      if (!submissionId) {
        const response = await saveDraftMutation.mutateAsync({
          assignmentId: creds._id,
          content: submissionText,
        });
        submissionId = response.id;
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("submissionId", submissionId);
      
      const result = await uploadFileAction(formData);
      
      if (result.success && result.media) {
        await utils.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.invalidate();
        toast({
          title: t("common:success"),
          description: t("common:files_uploaded", { count: 1 }),
        });
        return { success: true, url: result.media.url };
      }
      
      toast({
        title: t("common:error"),
        description: t("common:upload_failed"),
        variant: "destructive",
      });
      return { success: false };
    };
    
    const handleRemoveFile = async (index: number) => {
      const attachment = uploadedAttachments[index];
      const subId = submission?._id;
      
      if (!attachment || !subId) return;
      
      const confirmed = window.confirm(t("common:dialog.delete_confirm"));
      if (!confirmed) return;
      
      try {
        const result = await removeSubmissionAttachment(attachment.url, subId);
        if (result.success) {
          await utils.lmsModule.assignmentModule.assignmentSubmission.getMyByAssignmentId.invalidate();
          toast({
            title: t("common:success"),
            description: t("common:toast.removed_successfully", { item: t("common:file") }),
          });
        }
      } catch (error) {
        toast({
          title: t("common:error"),
          description: t("common:toast.remove_error", { item: t("common:file") }),
          variant: "destructive",
        });
      }
    };
    
    const handleDownload = async (url: string, filename: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        // Fallback to opening in new tab if download fails
        window.open(url, '_blank');
      }
    };
    
    const handleSaveDraft = () => {
      if (!assignment) return;
      saveDraftMutation.mutate({
        assignmentId: creds._id,
        content: submissionText,
      });
    };
    
    const handleSubmit = () => {
      if (!assignment) return;
      submitMutation.mutate({
        assignmentId: creds._id,
        content: submissionText,
      });
    };
    
    if(loadAssignmentDetailQuery.isLoading || loadAssignmentSubmissionQuery.isLoading) return <LoadingScreen />;
    
    if (!assignment) return <div className="text-center text-muted-foreground py-8">{t("common:not_found")}</div>;
  return (
<>
      {/* Assignment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("assignment:basic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">{t("assignment:due_date")}</div>
                <div className="font-medium">{assignment.dueDate ? format(assignment.dueDate, "MMM dd, yyyy") : t("common:no_due_date")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">{t("common:time")}</div>
                <div className="font-medium">{assignment.dueDate ? format(assignment.dueDate, "h:mm a") : "-"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">{t("assignment:total_points")}</div>
                <div className="font-medium">{assignment.totalPoints || 0} {t("assignment:pts")}</div>
              </div>
            </div>
          </div>

          {assignment.allowLateSubmission && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="text-sm">
                <span className="font-medium">{t("assignment:allow_late_submissions")}</span>
                {assignment.latePenalty > 0 && (
                  <span className="text-muted-foreground"> - {t("assignment:late_penalty")}: {assignment.latePenalty}%</span>
                )}
              </div>
            </div>
          )}

          <Separator />

          {assignment.description && (
          <div>
              <h3 className="font-semibold mb-2">{t("assignment:instructions")}</h3>
              <div className="text-sm whitespace-pre-line bg-muted/30 p-4 rounded-lg">
                {assignment.description}
              </div>
            </div>
          )}

          {assignment.rubrics && assignment.rubrics.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">{t("assignment:rubric")}</h3>
                <div className="space-y-2">
                  {assignment.rubrics.map((rubric, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{rubric.criterion}</div>
                          {rubric.description && (
                            <div className="text-xs text-muted-foreground mt-1">{rubric.description}</div>
                          )}
                        </div>
                        <Badge variant="outline">{rubric.points} {t("assignment:pts")}</Badge>
                      </div>
                    </div>
              ))}
            </div>
              </div>
            </>
          )}

          {assignment.attachments && assignment.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">{t("assignment:attachments")}</h3>
                <div className="space-y-2">
                  {assignment.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{file.originalFileName}</div>
                          <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownload(file.url || '', file.originalFileName)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t("common:download")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submission Section */}
      {submission && submission.status !== AssignmentSubmissionStatusEnum.DRAFT && !isEditMode ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">{t("assignment:student_submissions")}</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  {t("assignment:submitted")}: {submission.submittedAt ? format(new Date(submission.submittedAt), "MMM dd, yyyy 'at' h:mm a") : t("common:not_available")}
                </CardDescription>
              </div>
              {assignment.maxAttempts && (
                <Badge variant="outline">
                  {t("assignment:attempts_info", { current: submittedCount, max: assignment.maxAttempts })}
                </Badge>
              )}
              {!assignment.maxAttempts && (
                <Badge variant="outline">{t("common:unlimited")}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.content && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">{t("common:content")}</h4>
                <p className="text-sm bg-muted/30 p-3 rounded">{submission.content}</p>
              </div>
            )}
  
            {submission.attachments && submission.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">{t("assignment:attachments")}</h4>
                <div className="space-y-2">
                  {submission.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file.originalFileName}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownload(file.url, file.originalFileName)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t("common:download")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submission.score !== undefined && submission.score !== null && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{t("assignment:grade")}</h4>
                  <span className="text-2xl font-bold text-primary">
                    {submission.score}/{assignment.totalPoints || 0}
                  </span>
                </div>
                {submission.feedback && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">{t("assignment:feedback_label")}</h4>
                    <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                      {submission.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {canResubmit && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={handleEnterEditMode}
                  disabled={resubmitMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {resubmitMutation.isPending ? t("common:loading") : t("assignment:resubmit")}
                  {!resubmitMutation.isPending && attemptsLeft !== null && ` (${t("assignment:attempts_left", { count: attemptsLeft })})`}
                </Button>
              </div>
            )}
            
            {!canResubmit && assignment.maxAttempts && (
              <div className="border-t pt-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t("assignment:max_attempts_reached")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("assignment:student_submissions")}</CardTitle>
                <CardDescription>{t("assignment:submission_content")}</CardDescription>
              </div>
              {assignment.maxAttempts && attemptsLeft !== null ? (
                <Badge variant="outline">
                  {t("assignment:attempts_left", { count: attemptsLeft })}
                </Badge>
              ) : !assignment.maxAttempts && (
                <Badge variant="outline">{t("common:unlimited")}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("common:content")}</label>
              <Textarea
                placeholder={t("assignment:feedback_placeholder")}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={submitMutation.isPending || saveDraftMutation.isPending || resubmitMutation.isPending}
              />
            </div>

             <div>
               <label className="block text-sm font-medium mb-2">{t("assignment:attachments")}</label>
               <MediaUpload
                 onUpload={handleFileUpload}
                 onRemove={handleRemoveFile}
                 attachments={uploadedAttachments}
                 disabled={submitMutation.isPending || saveDraftMutation.isPending || resubmitMutation.isPending}
               />
               </div>

            <div className="flex gap-2">
              {isEditMode && (
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saveDraftMutation.isPending || submitMutation.isPending || resubmitMutation.isPending}
                  className="flex-1"
                >
                  {t("common:cancel")}
                </Button>
              )}
              {!isEditMode && (
                      <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending || submitMutation.isPending || resubmitMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveDraftMutation.isPending ? t("common:saving") : t("common:save_draft")}
                      </Button>
              )}
              <Button
                onClick={() => submitDialogControl.show()}
                disabled={submitMutation.isPending || saveDraftMutation.isPending || resubmitMutation.isPending || !submissionText.trim()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {t("common:submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FormDialog
        open={submitDialogControl.isVisible}
        onOpenChange={(open) => !open && submitDialogControl.hide()}
        title={t("assignment:confirm_submit_title")}
        description={t("assignment:confirm_submit_description")}
        onSubmit={handleSubmit}
        submitText={t("common:submit")}
        isLoading={submitMutation.isPending}
        maxWidth="md"
      >
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t("assignment:confirm_submit_description")}
          </p>
        </div>
      </FormDialog>
    </>
  );
}