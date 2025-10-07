"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { submitAssignmentAction, uploadFileAction } from "@/server/actions/assignment-submission";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { CheckCircle2, ChevronLeft, Clock, Loader2, Paperclip, Upload, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();

  const loadAssignmentQuery = trpc.lmsModule.assignmentModule.assignment.getById.useQuery({ id }, { enabled: !!id });
  const loadSubmissionsQuery = trpc.lmsModule.assignmentModule.assignmentSubmission.listMine.useQuery({
    filter: {},
    pagination: { skip: 0, take: 20 },
  });

  const submissions = (loadSubmissionsQuery.data?.items || []).filter((s) => s.assignmentId === id);

  const [submissionText, setSubmissionText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSubmissionText("");
    setAttachedFiles([]);
  }, [id]);

  const isSubmitted = submissions.some((s) => s.status === AssignmentSubmissionStatusEnum.SUBMITTED || s.status === AssignmentSubmissionStatusEnum.GRADED);

  const uploadMutation = useMutation({
    mutationFn: uploadFileAction,
    onSuccess: (data) => {
      if (data.url) setAttachedFiles(prev => [...prev, data.url]);
    }
  });

  const submitMutation = useMutation({
    mutationFn: submitAssignmentAction,
    onSuccess: () => {
      setConfirmOpen(false);
      loadSubmissionsQuery.refetch();
    }
  });

  const assignment = useMemo(() => loadAssignmentQuery.data, [loadAssignmentQuery.data]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await uploadMutation.mutateAsync(fd);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachedFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  const isPastDue = assignment?.dueDate && Date.now() > new Date(assignment?.dueDate).getTime();
  const canSubmit = assignment && !isSubmitted && (!isPastDue || assignment?.allowLateSubmission);

  const handleSubmit = async () => {
    if (!id) return;
    const fd = new FormData();
    fd.append("assignmentId", id);
    fd.append("content", submissionText);
    attachedFiles.forEach(url => fd.append("attachments", url));
    await submitMutation.mutateAsync(fd);
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb and Back Navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-brand-primary hover:bg-brand-primary/10"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/assignments" className="hover:text-brand-primary transition-colors">Assignments</Link>
            <span>/</span>
            <span className="text-foreground">{assignment?.title || "Assignment"}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl font-bold text-foreground">{assignment?.title || "Assignment"}</h1>
            <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
              {assignment?.dueDate && (
                <Badge
                  variant={isPastDue ? "destructive" : "secondary"}
                  className={`flex items-center gap-1 ${!isPastDue ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" : ""}`}
                >
                  <Clock className="h-3 w-3" />
                  Due: {new Date(assignment.dueDate).toLocaleString()}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                {assignment?.totalPoints || 0} points
              </Badge>
              {assignment?.difficulty && (
                <Badge variant="outline" className="border-brand-primary/30 text-brand-primary">
                  {assignment.difficulty}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Assignment Details */}
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-xl text-brand-primary">Assignment Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {assignment?.description && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">{assignment.description}</p>
                    </div>
                  )}

                  {assignment?.instructions && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Instructions</h3>
                      <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{assignment.instructions}</p>
                      </div>
                    </div>
                  )}

                  {assignment?.requirements?.length && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Tasks</h3>
                      <ul className="space-y-2">
                        {assignment.requirements.map((req: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-xs font-medium text-brand-primary">{idx + 1}</span>
                            </div>
                            <span className="text-sm leading-relaxed">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submission Form */}
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-xl text-brand-primary">Your Submission</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <label className="font-medium text-foreground">Submission Text</label>
                    <Textarea
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Enter your submission content here..."
                      className="min-h-32 resize-none border-border focus:border-brand-primary focus:ring-brand-primary/20"
                      disabled={isSubmitted}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="font-medium text-foreground">File Attachments</label>
                    <div className="space-y-4">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="border-dashed border-2 border-brand-primary/20 hover:border-brand-primary/40 focus:border-brand-primary h-auto p-4"
                        disabled={isSubmitted || uploadMutation.isPending}
                      />

                      {uploadMutation.isPending && (
                        <div className="flex items-center gap-2 text-sm text-brand-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading files...
                        </div>
                      )}

                      {attachedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Attached Files:</p>
                          <ul className="space-y-2">
                            {attachedFiles.map((url, idx) => (
                              <li key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center">
                                    <Paperclip className="h-4 w-4 text-brand-primary" />
                                  </div>
                                  <a
                                    className="text-brand-primary hover:text-brand-primary-hover font-medium transition-colors"
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    File {idx + 1}
                                  </a>
                                </div>
                                {!isSubmitted && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachedFile(idx)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    {isSubmitted && (
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle2 className="h-5 w-5" />
                        Assignment Submitted
                      </div>
                    )}

                    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                      <DialogTrigger asChild>
                        <Button
                          disabled={!canSubmit || submitMutation.isPending}
                          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-8 py-3 font-semibold transition-all duration-300 transform hover:scale-105 ml-auto"
                        >
                          {submitMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {isSubmitted ? "Submitted" : "Submit Assignment"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-border">
                        <DialogHeader>
                          <DialogTitle className="text-xl text-brand-primary">Final Submission</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-muted-foreground">
                            Are you ready to submit your assignment? This action cannot be undone.
                          </p>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800">
                              <strong>Note:</strong> Once submitted, you will not be able to make changes to your submission.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
                          >
                            {submitMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Confirm Submission
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Assignment Status */}
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-lg text-brand-primary">Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={isSubmitted ? "default" : "secondary"} className={isSubmitted ? "bg-green-100 text-green-800" : ""}>
                        {isSubmitted ? "Submitted" : "Not Submitted"}
                      </Badge>
                    </div>

                    {assignment?.maxAttempts && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Attempts:</span>
                        <span className="font-medium">{submissions.length} / {assignment.maxAttempts}</span>
                      </div>
                    )}

                    {assignment?.allowLateSubmission !== undefined && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Late Submissions:</span>
                        <Badge variant={assignment.allowLateSubmission ? "secondary" : "destructive"}>
                          {assignment.allowLateSubmission ? "Allowed" : "Not Allowed"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Previous Submissions */}
              {submissions.length > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-lg text-brand-primary">Previous Submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-3">
                      {submissions.map((submission: any, idx: number) => (
                        <li key={idx} className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={submission.status === "graded" ? "default" : "secondary"}>
                              {submission.status}
                            </Badge>
                            {submission.score && (
                              <span className="text-sm font-medium text-brand-primary">
                                {submission.score}/{assignment?.totalPoints}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                          {submission.feedback && (
                            <p className="text-sm bg-muted p-2 rounded text-muted-foreground">
                              {submission.feedback}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}