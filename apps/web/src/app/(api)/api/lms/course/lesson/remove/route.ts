import { getActionContext } from "@/server/api/core/actions";
import { NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { getStorageProvider } from "@/server/services/storage-provider";
import { AttachmentModel } from "@workspace/common-logic/models/media.model";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActionContext();
    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId) {
      throw new ValidationException("Media ID is required");
    }

    const attachment = await AttachmentModel.findOne({
      mediaId,
      orgId: ctx.domainData.domainObj.orgId,
    });

    if (!attachment) {
      throw new NotFoundException("Media", mediaId);
    }

    await getStorageProvider(attachment.storageProvider).deleteFile(attachment);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Lesson media removal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Removal failed" },
      { status: 500 },
    );
  }
}

