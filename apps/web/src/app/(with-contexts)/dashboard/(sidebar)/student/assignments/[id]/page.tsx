"use client";


export default function Page() {
    return <div>Assignment</div>;
}

// TODO: Implement the assignment submission
// "use client";

// import { useCallback, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { useTranslation } from "react-i18next";
// import { Calendar, Clock, FileText, CheckCircle, AlertCircle, Upload, ArrowLeft } from "lucide-react";
// import { trpc } from "@/utils/trpc";
// import DashboardContent from "@/components/dashboard/dashboard-content";
// import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
// import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
// import { Button } from "@workspace/ui/components/button";
// import { Badge } from "@workspace/ui/components/badge";
// import { Skeleton } from "@workspace/ui/components/skeleton";
// import { Textarea } from "@workspace/ui/components/textarea";
// import { useToast } from "@workspace/components-library";
// import { format, isPast } from "date-fns";
// import { cn } from "@workspace/ui/lib/utils";

// export default function Page() {
//     const { t } = useTranslation(["dashboard", "common"]);
//     const params = useParams<{ id: string }>();
//     const router = useRouter();
//     const { toast } = useToast();

//     const [submissionText, setSubmissionText] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const loadAssignmentQuery = trpc.lmsModule.assignmentModule.assignment.getById.useQuery(
//         { id: params.id },
//         { enabled: !!params.id }
//     );

//     const loadSubmissionQuery = trpc.lmsModule.assignmentModule.assignmentSubmission.listMine.useQuery(
//         { assignmentId: params.id },
//         { enabled: !!params.id }
//     );

//     const submitAssignmentMutation = trpc.lmsModule.assignmentModule.assignmentSubmission.submit.useMutation({
//         onSuccess: () => {
//             toast({
//                 title: "Success",
//                 description: "Assignment submitted successfully",
//             });
//             loadSubmissionQuery.refetch();
//             setSubmissionText("");
//         },
//         onError: (error) => {
//             toast({
//                 title: "Error",
//                 description: error.message,
//                 variant: "destructive",
//             });
//         },
//     });

//     const handleSubmit = useCallback(async () => {
//         if (!submissionText.trim()) {
//             toast({
//                 title: "Error",
//                 description: "Please enter your submission",
//                 variant: "destructive",
//             });
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             await submitAssignmentMutation.mutateAsync({
//                 data: {
//                     assignmentId: params.id,
//                     content: submissionText,
//                     status: "submitted",
//                 },
//             });
//         } finally {
//             setIsSubmitting(false);
//         }
//     }, [submissionText, submitAssignmentMutation, params.id, toast]);

//     const assignment = loadAssignmentQuery.data;
//     const submission = loadSubmissionQuery.data;
//     const isLoading = loadAssignmentQuery.isLoading || loadSubmissionQuery.isLoading;

//     const breadcrumbs = [
//         { label: "Assignments", href: "/dashboard/student/assignments" },
//         { label: assignment?.title || "Assignment", href: "#" },
//     ];

//     if (isLoading) {
//         return (
//             <DashboardContent breadcrumbs={breadcrumbs}>
//                 <LoadingSkeleton />
//             </DashboardContent>
//         );
//     }

//     if (!assignment) {
//         return (
//             <DashboardContent breadcrumbs={breadcrumbs}>
//                 <div className="text-center py-16">
//                     <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
//                     <h3 className="text-lg font-semibold mb-2">Assignment not found</h3>
//                     <Button onClick={() => router.back()}>Go Back</Button>
//                 </div>
//             </DashboardContent>
//         );
//     }

//     const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
//     const isOverdue = dueDate && isPast(dueDate);
//     const isSubmitted = submission?.status === "submitted" || submission?.status === "graded";

//     return (
//         <DashboardContent breadcrumbs={breadcrumbs}>
//             <HeaderTopbar
//                 header={{
//                     title: assignment.title,
//                     subtitle: assignment.course?.title,
//                 }}
//                 rightAction={
//                     <Button variant="outline" onClick={() => router.back()}>
//                         <ArrowLeft className="h-4 w-4 mr-2" />
//                         Back
//                     </Button>
//                 }
//             />

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 {/* Main Content */}
//                 <div className="lg:col-span-2 space-y-6">
//                     {/* Assignment Details */}
//                     <Card>
//                         <CardHeader>
//                             <CardTitle>Assignment Details</CardTitle>
//                         </CardHeader>
//                         <CardContent className="space-y-4">
//                             <div className="flex flex-wrap items-center gap-4 text-sm">
//                                 {dueDate && (
//                                     <div className={cn(
//                                         "flex items-center gap-1",
//                                         isOverdue && "text-red-600"
//                                     )}>
//                                         {isOverdue ? (
//                                             <AlertCircle className="h-4 w-4" />
//                                         ) : (
//                                             <Calendar className="h-4 w-4" />
//                                         )}
//                                         <span>
//                                             Due: {format(dueDate, "MMMM d, yyyy 'at' h:mm a")}
//                                         </span>
//                                     </div>
//                                 )}
//                                 {assignment.totalPoints && (
//                                     <div className="flex items-center gap-1">
//                                         <FileText className="h-4 w-4" />
//                                         <span>{assignment.totalPoints} points</span>
//                                     </div>
//                                 )}
//                                 {assignment.estimatedDuration && (
//                                     <div className="flex items-center gap-1">
//                                         <Clock className="h-4 w-4" />
//                                         <span>{assignment.estimatedDuration} minutes</span>
//                                     </div>
//                                 )}
//                             </div>

//                             {assignment.description && (
//                                 <div>
//                                     <h4 className="font-semibold mb-2">Description</h4>
//                                     <div
//                                         className="prose prose-sm max-w-none"
//                                         dangerouslySetInnerHTML={{ __html: assignment.description }}
//                                     />
//                                 </div>
//                             )}

//                             {assignment.instructions && (
//                                 <div>
//                                     <h4 className="font-semibold mb-2">Instructions</h4>
//                                     <div
//                                         className="prose prose-sm max-w-none"
//                                         dangerouslySetInnerHTML={{ __html: assignment.instructions }}
//                                     />
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>

//                     {/* Submission Section */}
//                     {submission?.status === "graded" ? (
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2">
//                                     <CheckCircle className="h-5 w-5 text-green-600" />
//                                     Graded
//                                 </CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div className="grid grid-cols-2 gap-4">
//                                     <div>
//                                         <p className="text-sm text-muted-foreground">Your Score</p>
//                                         <p className="text-2xl font-bold text-green-600">
//                                             {submission.score}/{assignment.totalPoints}
//                                         </p>
//                                         {typeof submission.percentageScore === "number" && (
//                                             <p className="text-sm text-muted-foreground">
//                                                 {Math.round(submission.percentageScore)}%
//                                             </p>
//                                         )}
//                                     </div>
//                                     {submission.gradedAt && (
//                                         <div>
//                                             <p className="text-sm text-muted-foreground">Graded On</p>
//                                             <p className="font-medium">
//                                                 {format(new Date(submission.gradedAt), "MMM d, yyyy")}
//                                             </p>
//                                         </div>
//                                     )}
//                                 </div>

//                                 {submission.feedback && (
//                                     <div>
//                                         <h4 className="font-semibold mb-2">Instructor Feedback</h4>
//                                         <div className="p-4 bg-muted rounded-lg">
//                                             <p className="text-sm">{submission.feedback}</p>
//                                         </div>
//                                     </div>
//                                 )}

//                                 {submission.content && (
//                                     <div>
//                                         <h4 className="font-semibold mb-2">Your Submission</h4>
//                                         <div className="p-4 border rounded-lg">
//                                             <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
//                                         </div>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     ) : isSubmitted ? (
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle className="flex items-center gap-2">
//                                     <CheckCircle className="h-5 w-5 text-blue-600" />
//                                     Submitted
//                                 </CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <p className="text-muted-foreground mb-4">
//                                     Your assignment has been submitted and is waiting to be graded.
//                                 </p>
//                                 {submission?.submittedAt && (
//                                     <p className="text-sm text-muted-foreground">
//                                         Submitted on {format(new Date(submission.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
//                                     </p>
//                                 )}
//                                 {submission?.content && (
//                                     <div className="mt-4">
//                                         <h4 className="font-semibold mb-2">Your Submission</h4>
//                                         <div className="p-4 border rounded-lg">
//                                             <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
//                                         </div>
//                                     </div>
//                                 )}
//                             </CardContent>
//                         </Card>
//                     ) : (
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Submit Assignment</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 {isOverdue && (
//                                     <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
//                                         <AlertCircle className="h-5 w-5" />
//                                         <span className="font-medium">This assignment is overdue</span>
//                                     </div>
//                                 )}

//                                 <div className="space-y-4">
//                                     <div>
//                                         <label className="block text-sm font-medium mb-2">
//                                             Your Submission
//                                         </label>
//                                         <Textarea
//                                             value={submissionText}
//                                             onChange={(e) => setSubmissionText(e.target.value)}
//                                             placeholder="Enter your assignment submission here..."
//                                             rows={10}
//                                             className="resize-none"
//                                         />
//                                     </div>

//                                     <Button
//                                         onClick={handleSubmit}
//                                         disabled={isSubmitting || !submissionText.trim()}
//                                         className="w-full"
//                                     >
//                                         <Upload className="h-4 w-4 mr-2" />
//                                         {isSubmitting ? "Submitting..." : "Submit Assignment"}
//                                     </Button>
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     )}
//                 </div>

//                 {/* Sidebar */}
//                 <div className="space-y-6">
//                     {/* Status Card */}
//                     <Card>
//                         <CardHeader>
//                             <CardTitle>Status</CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                             <StatusBadge submission={submission} />
//                         </CardContent>
//                     </Card>

//                     {/* Info Card */}
//                     <Card>
//                         <CardHeader>
//                             <CardTitle>Information</CardTitle>
//                         </CardHeader>
//                         <CardContent className="space-y-3 text-sm">
//                             <div>
//                                 <p className="text-muted-foreground">Course</p>
//                                 <p className="font-medium">{assignment.course?.title}</p>
//                             </div>
//                             {dueDate && (
//                                 <div>
//                                     <p className="text-muted-foreground">Due Date</p>
//                                     <p className="font-medium">{format(dueDate, "MMM d, yyyy")}</p>
//                                 </div>
//                             )}
//                             <div>
//                                 <p className="text-muted-foreground">Points</p>
//                                 <p className="font-medium">{assignment.totalPoints || "Not specified"}</p>
//                             </div>
//                             {assignment.type && (
//                                 <div>
//                                     <p className="text-muted-foreground">Type</p>
//                                     <p className="font-medium capitalize">{assignment.type}</p>
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>
//             </div>
//         </DashboardContent>
//     );
// }

// function StatusBadge({ submission }: { submission: any }) {
//     if (!submission) {
//         return <Badge variant="outline">Not Submitted</Badge>;
//     }

//     if (submission.status === "graded") {
//         return <Badge className="bg-green-500">Graded</Badge>;
//     }

//     if (submission.status === "submitted") {
//         return <Badge variant="secondary">Submitted</Badge>;
//     }

//     return <Badge variant="outline">Draft</Badge>;
// }

// function LoadingSkeleton() {
//     return (
//         <div className="space-y-6">
//             <Skeleton className="h-16 w-full" />
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 <div className="lg:col-span-2 space-y-6">
//                     <Card>
//                         <CardHeader>
//                             <Skeleton className="h-6 w-1/3" />
//                         </CardHeader>
//                         <CardContent>
//                             <Skeleton className="h-32 w-full" />
//                         </CardContent>
//                     </Card>
//                 </div>
//                 <div>
//                     <Card>
//                         <CardHeader>
//                             <Skeleton className="h-6 w-1/3" />
//                         </CardHeader>
//                         <CardContent>
//                             <Skeleton className="h-16 w-full" />
//                         </CardContent>
//                     </Card>
//                 </div>
//             </div>
//         </div>
//     );
// }