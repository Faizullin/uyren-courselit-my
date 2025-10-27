"use server";

import { AuthenticationException, AuthorizationException, ConflictException, NotFoundException } from "@/server/api/core/exceptions";
import { ActionContext, getActionContext } from "@/server/api/core/actions";
import { getStorageProvider } from "@/server/services/storage-provider";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { AttachmentModel } from "@workspace/common-logic/models/media.model";
import { MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { checkPermission } from "@workspace/utils";
import mongoose from "mongoose";

async function validateFileOwnership(url: string, ctx: ActionContext) {
  const attachment = await AttachmentModel.findOne({
    url,
    ownerId: ctx.user._id,
    orgId: ctx.domainData.domainObj.orgId,
  });

  if (!attachment) {
    throw new NotFoundException("Attachment", url);
  }

  return attachment;
}

async function validateSubmissionOwnership(submissionId: string, ctx: ActionContext) {
  const submission = await AssignmentSubmissionModel.findOne({
    _id: submissionId,
    orgId: ctx.domainData.domainObj.orgId,
  });

  if (!submission) {
    throw new NotFoundException("Submission", submissionId);
  }

  const isOwner = submission.userId.equals(ctx.user._id);
  const hasManagePermission = checkPermission(ctx.user.permissions, [
    UIConstants.permissions.manageCourse,
    UIConstants.permissions.manageAnyCourse,
  ]);

  if (!isOwner && !hasManagePermission) {
    throw new AuthorizationException("You don't have permission to access this submission");
  }

  return submission;
}

export async function uploadFileAction(formData: FormData) {
  await connectToDatabase();
  const ctx = await getActionContext();
  
  const file = formData.get("file") as File;
  const submissionId = formData.get("submissionId") as string;

  if (!file) throw new AuthenticationException("File is required");
  if (!submissionId) throw new AuthenticationException("Submission ID is required");
  if (file.size > 50 * 1024 * 1024) throw new ConflictException("File size exceeds 50MB limit");

  const allowedTypes = ["image/", "video/", "audio/", "application/pdf", "application/zip", "text/"];
  const isValidType = allowedTypes.some(type => file.type.startsWith(type));
  
  if (!isValidType) {
    throw new ConflictException("Unsupported file type");
  }

  const submission = await validateSubmissionOwnership(submissionId, ctx);

  if (submission.status !== AssignmentSubmissionStatusEnum.DRAFT) {
    throw new ConflictException("Cannot add attachments to submitted assignment");
  }

  const attachment = await getStorageProvider().uploadFile(
    {
      file,
      userId: ctx.user._id as mongoose.Types.ObjectId,
      type: "assignment-submission",
      caption: file.name,
      access: MediaAccessTypeEnum.PRIVATE,
      entityType: "assignment-submission",
      entityId: submissionId,
    },
    ctx.domainData.domainObj as IDomainHydratedDocument,
  );

  const media = attachment.toObject();
  submission.attachments.push(media);
  await submission.save();
  
  return { 
    success: true, 
    url: attachment.url,
    media: {
      mediaId: media.mediaId,
      url: media.url,
      originalFileName: media.originalFileName,
      storageProvider: media.storageProvider,
      size: media.size,
      mimeType: media.mimeType,
      orgId: media.orgId,
      access: media.access,
      thumbnail: media.thumbnail,
      caption: media.caption,
    }
  };
}

export async function removeSubmissionAttachment(url: string, submissionId: string) {
  await connectToDatabase();
  const ctx = await getActionContext();

  if (!submissionId) throw new AuthenticationException("Submission ID is required");

  const attachment = await validateFileOwnership(url, ctx);
  const submission = await validateSubmissionOwnership(submissionId, ctx);

  if (submission.status !== AssignmentSubmissionStatusEnum.DRAFT) {
    throw new ConflictException("Cannot modify attachments of submitted assignment");
  }

  submission.attachments = submission.attachments.filter(att => att.url !== url);
  await submission.save();

  await getStorageProvider(attachment.storageProvider).deleteFile(attachment.toObject());
  await AttachmentModel.deleteOne({ _id: attachment._id });

  return { success: true };
}



