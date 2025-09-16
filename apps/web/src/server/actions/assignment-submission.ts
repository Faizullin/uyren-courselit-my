"use server";

import { AssignmentModel, AssignmentSubmissionModel } from "@/models/lms";
import { connectToDatabase } from "@workspace/common-logic";
import { BASIC_PUBLICATION_STATUS_TYPE } from "@workspace/common-models";
import { getServerSession, User } from "next-auth";
import { AuthenticationException, NotFoundException } from "../api/core/exceptions";
import { getDomainData } from "@/server/lib/domain";
import { authOptions } from "@/lib/auth/options";
import { Domain } from "@/models/Domain";

// Types
interface ActionContext {
  user: User;
  domainData: {
    domainObj: Domain;
    headers: { type: string; host: string; identifier: string };
  };
}

interface SubmissionData {
  content: string;
  attachments?: string[];
}
// Core functions
async function getActionContext(): Promise<ActionContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AuthenticationException("User not authenticated");
  }

  const domainData = await getDomainData();
  if (!domainData.domainObj) {
    throw new NotFoundException("Domain");
  }

  return {
    user: session.user,
    domainData: {
      domainObj: domainData.domainObj,
      headers: domainData.headers,
    },
  };
}

const validateAssignment = async (assignmentId: string, ctx: ActionContext) => {
  const assignment = await AssignmentModel.findOne({
    _id: assignmentId,
    domain: ctx.domainData.domainObj._id,
  });
  if (!assignment) {
    throw new Error("Assignment not found");
  }
  if (assignment.status !== BASIC_PUBLICATION_STATUS_TYPE.PUBLISHED) {
    throw new Error("Assignment is not published");
  }
  if (
    assignment.dueDate &&
    new Date() > assignment.dueDate &&
    !assignment.allowLateSubmission
  ) {
    throw new Error(
      "Assignment is overdue and late submissions are not allowed",
    );
  }
  return assignment;
};

export async function createAssignmentSubmission(
  assignmentId: string,
  userId: string,
  domainId: string,
  data: SubmissionData,
): Promise<any> {
  await connectToDatabase();
  const ctx = await getActionContext();
  const assignment = await validateAssignment(assignmentId, ctx);
  // Check existing submissions
  const existingSubmissions = await AssignmentSubmissionModel.countDocuments({
    assignmentId,
    userId,
    domain: domainId,
    status: { $in: ["submitted", "graded"] },
  });

  if (existingSubmissions >= assignment.maxSubmissions) {
    throw new Error("Maximum submissions reached");
  }

  const submission = await AssignmentSubmissionModel.create({
    assignmentId,
    userId,
    domain: domainId,
    status: "submitted",
    submittedAt: new Date(),
    content: data.content,
    attachments: data.attachments || [],
    resubmissionCount: existingSubmissions,
  });

  return submission;
}

export async function gradeAssignmentSubmission(
  submissionId: string,
  graderId: string,
  gradeData: {
    score: number;
    feedback?: string;
    rubricScores?: Array<{
      criterionId: string;
      score: number;
      feedback?: string;
    }>;
  },
): Promise<any> {
  await connectToDatabase();

  const submission = await AssignmentSubmissionModel.findById(submissionId);
  if (!submission) {
    throw new Error("Submission not found");
  }

  const assignment = await AssignmentModel.findById(submission.assignmentId);
  if (!assignment) {
    throw new Error("Assignment not found");
  }

  // Calculate percentage score
  const percentageScore =
    assignment.totalPoints > 0
      ? (gradeData.score / assignment.totalPoints) * 100
      : 0;

  // Apply late penalty if applicable
  let finalScore = gradeData.score;
  if (assignment.dueDate && submission.submittedAt > assignment.dueDate) {
    const latePenalty = Math.min(
      assignment.latePenalty || 0,
      gradeData.score * (assignment.latePenalty / 100),
    );
    finalScore = Math.max(0, gradeData.score - latePenalty);
  }

  const updatedSubmission = await AssignmentSubmissionModel.findByIdAndUpdate(
    submissionId,
    {
      status: "graded",
      score: finalScore,
      percentageScore: (finalScore / assignment.totalPoints) * 100,
      feedback: gradeData.feedback,
      gradedAt: new Date(),
      gradedBy: graderId,
      latePenaltyApplied:
        finalScore < gradeData.score ? gradeData.score - finalScore : 0,
    },
    { new: true },
  );

  return updatedSubmission;
}

export async function addPeerReview(
  submissionId: string,
  reviewerId: string,
  reviewData: {
    score: number;
    feedback: string;
  },
): Promise<any> {
  await connectToDatabase();

  const submission = await AssignmentSubmissionModel.findById(submissionId);
  if (!submission) {
    throw new Error("Submission not found");
  }

  const assignment = await AssignmentModel.findById(submission.assignmentId);
  if (!assignment || !assignment.peerReviewEnabled) {
    throw new Error("Peer review not enabled for this assignment");
  }

  const peerReview = {
    reviewerId,
    score: reviewData.score,
    feedback: reviewData.feedback,
    reviewedAt: new Date(),
  };

  const updatedSubmission = await AssignmentSubmissionModel.findByIdAndUpdate(
    submissionId,
    { $push: { peerReviews: peerReview } },
    { new: true },
  );

  return updatedSubmission;
}

export async function calculateSubmissionStatistics(
  assignmentId: string,
  domainId: string,
): Promise<{
  totalSubmissions: number;
  averageScore: number;
  submissionRate: number;
  gradeDistribution: Record<string, number>;
}> {
  await connectToDatabase();

  const assignment = await AssignmentModel.findOne({
    _id: assignmentId,
    domain: domainId,
  });
  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const submissions = await AssignmentSubmissionModel.find({
    assignmentId,
    domain: domainId,
    status: "graded",
  });

  const totalSubmissions = submissions.length;
  const averageScore =
    totalSubmissions > 0
      ? submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) /
        totalSubmissions
      : 0;

  // Calculate grade distribution (A, B, C, D, F)
  const gradeDistribution = {
    A: 0, // 90-100%
    B: 0, // 80-89%
    C: 0, // 70-79%
    D: 0, // 60-69%
    F: 0, // Below 60%
  };

  submissions.forEach((sub) => {
    const percentage = sub.percentageScore || 0;
    if (percentage >= 90) gradeDistribution.A++;
    else if (percentage >= 80) gradeDistribution.B++;
    else if (percentage >= 70) gradeDistribution.C++;
    else if (percentage >= 60) gradeDistribution.D++;
    else gradeDistribution.F++;
  });

  return {
    totalSubmissions,
    averageScore,
    submissionRate: 0, // Would need total enrolled students to calculate
    gradeDistribution,
  };
}

export async function uploadFileAction(formData: FormData) {
  const ctx = await getActionContext();
  const file = formData.get("file") as File;
  
  if (!file) throw new Error("File is required");
  if (file.size > 15 * 1024 * 1024) throw new Error("File too large");
  
  const allowed = ["image/", "video/", "audio/", "application/pdf", "application/zip", "text/"];
  const ok = allowed.some(t => file.type.startsWith(t));
  if (!ok) throw new Error("Unsupported file type");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("caption", file.name);
  fd.append("access", "private");

  const headersList = await (await import("next/headers")).headers();
  const proto = headersList.get("x-forwarded-proto") || "http";
  const host = headersList.get("host") || "localhost:3000";
  
  const res = await fetch(`${proto}://${host}/api/services/media/upload?storageType=cloudinary`, {
    method: "POST",
    body: fd,
  });
  
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  const url = json?.url || json?.media?.url;
  if (!url) throw new Error("Upload response invalid");
  
  return { success: true, url };
}

export async function submitAssignmentAction(formData: FormData) {
  const ctx = await getActionContext();
  await connectToDatabase();

  const assignmentId = String(formData.get("assignmentId") || "");
  if (!assignmentId) throw new Error("assignmentId is required");

  const assignment = await validateAssignment(assignmentId, ctx);

  const content = String(formData.get("content") || "");
  const attachments = formData.getAll("attachments").filter(Boolean).map(String);


  const submission = await AssignmentSubmissionModel.create({
    assignmentId,
    userId: ctx.user.userId,
    domain: ctx.domainData.domainObj._id,
    status: "submitted",
    submittedAt: new Date(),
    content,
    attachments,
    resubmissionCount: 0,
  });

  return { success: true, id: submission._id.toString() };
}
