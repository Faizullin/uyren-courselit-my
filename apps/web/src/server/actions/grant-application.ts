"use server";

import { authOptions } from "@/lib/auth/options";
import { getActionContext } from "@/server/api/core/actions";
import { AuthenticationException, NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { getDomainData } from "@/server/lib/domain";
import { submissionRateLimiter } from "@/server/lib/rate-limit";
import { ApprovalStatusEnum } from "@workspace/common-logic/lib/approval_status";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { GrantApplicationModel } from "@workspace/common-logic/models/lms/grant-application.model";
import { AidTypeEnum, EducationStatusEnum, IntendedTrackEnum } from "@workspace/common-logic/models/lms/grant-application.types";
import { UserModel } from "@workspace/common-logic/models/user.model";
import { getServerSession } from "next-auth";
import { z } from "zod";


const grantApplicationSchema = z.object({
  fullName: z.string().min(1, "Full name is required").trim(),
  email: z.string().min(1, "Email is required").email("Valid email is required").trim().toLowerCase(),
  phone: z.string().min(1, "Phone number is required").trim(),
  educationStatus: z.nativeEnum(EducationStatusEnum, { errorMap: () => ({ message: "Education status is required" }) }),
  intendedTrack: z.nativeEnum(IntendedTrackEnum, { errorMap: () => ({ message: "Intended track is required" }) }),
  aidType: z.nativeEnum(AidTypeEnum, { errorMap: () => ({ message: "Aid type is required" }) }),
  motivation: z.string().min(100, "Motivation must be at least 100 characters").max(1000, "Motivation must not exceed 1000 characters").trim(),
  consent: z.boolean().refine((val) => val === true, { message: "You must agree to the privacy policy" }),
});

type GrantApplicationInput = z.infer<typeof grantApplicationSchema>;

export async function submitGrantApplication(data: GrantApplicationInput): Promise<{
  success: boolean;
  message: string;
  applicationId?: string;
}> {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const domainData = await getDomainData();

    if (!domainData.domainObj) {
      throw new NotFoundException("Domain not found");
    }

    // Get user if authenticated
    let user = null;
    if (session?.user) {
      user = await UserModel.findById(session.user.id).lean();
    }

    const validatedData = grantApplicationSchema.parse(data);

    const rateLimitKey = user?._id?.toString() || validatedData.email;
    if (!(await submissionRateLimiter.checkAndRecord(rateLimitKey))) {
      throw new ValidationException("Too many submissions. Please try again later.");
    }

    const existingApplication = await GrantApplicationModel.findOne({
      email: validatedData.email,
      orgId: domainData.domainObj.orgId,
      approvalStatus: ApprovalStatusEnum.PENDING,
    });

    if (existingApplication) {
      throw new ValidationException("You already have a pending application. Please wait for review.");
    }

    const application = await GrantApplicationModel.create({
      orgId: domainData.domainObj.orgId,
      userId: user?._id,
      ...validatedData,
      approvalStatus: ApprovalStatusEnum.PENDING,
    });

    return {
      success: true,
      message: "Grant application submitted successfully",
      applicationId: application._id.toString(),
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { success: false, message: error.issues[0]?.message || "Validation failed" };
    }

    if (error instanceof ValidationException || error instanceof AuthenticationException || error instanceof NotFoundException) {
      return { success: false, message: error.message };
    }

    console.error("Grant application submission error:", error);
    return { success: false, message: "Failed to submit grant application. Please try again." };
  }
}

export async function getMyApplications(): Promise<{
  success: boolean;
  applications?: any[];
  message?: string;
}> {
  try {
    const ctx = await getActionContext();

    const applications = await GrantApplicationModel.find({
      userId: ctx.user._id,
      orgId: ctx.domainData.domainObj.orgId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      applications: applications.map((app) => ({
        _id: app._id.toString(),
        fullName: app.fullName,
        email: app.email,
        educationStatus: app.educationStatus,
        intendedTrack: app.intendedTrack,
        aidType: app.aidType,
        approvalStatus: app.approvalStatus,
        createdAt: app.createdAt,
        reviewedAt: app.reviewedAt,
        reviewedNotes: app.reviewedNotes,
      })),
    };
  } catch (error: any) {
    if (error instanceof ValidationException || error instanceof AuthenticationException || error instanceof NotFoundException) {
      return { success: false, message: error.message };
    }

    console.error("Get applications error:", error);
    return { success: false, message: "Failed to load applications" };
  }
}

