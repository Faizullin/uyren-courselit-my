import { getActionContext } from "@/server/api/core/actions";
import { NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { getStorageProvider } from "@/server/services/storage-provider";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActionContext();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const lessonId = formData.get("lessonId") as string;

    if (!file) {
      throw new ValidationException("No file provided");
    }

    if (!lessonId) {
      throw new ValidationException("Lesson ID is required");
    }

    const lesson = await LessonModel.findOne({
      _id: lessonId,
      orgId: ctx.domainData.domainObj.orgId,
    });

    if (!lesson) {
      throw new NotFoundException("Lesson", lessonId);
    }

    const attachment = await getStorageProvider().uploadFile(
      {
        file,
        userId: ctx.user._id as mongoose.Types.ObjectId,
        type: "lesson",
        caption: `Media for ${lesson.title}`,
        access: MediaAccessTypeEnum.PUBLIC,
        entityType: "lesson",
        entityId: lessonId,
      },
      ctx.domainData.domainObj as IDomainHydratedDocument,
    );

    const media = attachment.toObject();

    return NextResponse.json({
      success: true,
      media: {
        _id: media._id.toString(),
        mediaId: media.mediaId,
        orgId: media.orgId.toString(),
        storageProvider: media.storageProvider,
        url: media.url,
        originalFileName: media.originalFileName,
        mimeType: media.mimeType,
        size: media.size,
        access: media.access,
        thumbnail: media.thumbnail,
        caption: media.caption,
        file: media.file,
        metadata: media.metadata,
        ownerId: media.ownerId.toString(),
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Lesson media upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}

