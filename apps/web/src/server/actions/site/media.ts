"use server";

import { getActionContext } from "@/server/api/core/actions";
import { ValidationException } from "@/server/api/core/exceptions";
import DomainManager from "@/server/lib/domain";
import { getStorageProvider } from "@/server/services/storage-provider";
import { IAttachmentMedia, MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { DomainModel, IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { ISiteInfo } from "@workspace/common-logic/models/organization.types";
import mongoose from "mongoose";

interface UploadMediaResult {
  success: boolean;
  media?: IAttachmentMedia[];
  error?: string;
}

interface RemoveMediaResult {
  success: boolean;
  error?: string;
}

export async function uploadLogo(formData: FormData): Promise<UploadMediaResult> {
  try {
    const ctx = await getActionContext();
    const files = formData.getAll("file") as File[];
    if (!files || files.length === 0) return { success: false, error: "No files provided" };

    const file = files[0];
    if (!file) throw new ValidationException("No file provided");
    if (!file.type.startsWith("image/")) throw new ValidationException("Only image files are allowed");
    if (file.size > 5 * 1024 * 1024) throw new ValidationException("Image must be less than 5MB");

    const domain = await DomainModel.findOne({ name: ctx.domainData.domainObj.name });
    if (!domain) throw new ValidationException("Domain not found");

    const attachment = await getStorageProvider().uploadFile(
      {
        file,
        userId: ctx.user._id as mongoose.Types.ObjectId,
        type: "domain",
        caption: "Site logo",
        access: MediaAccessTypeEnum.PUBLIC,
        entityType: "domain",
        entityId: domain._id,
      },
      domain as IDomainHydratedDocument,
    );

    if (!domain.siteInfo) domain.siteInfo = {} as ISiteInfo;
    domain.siteInfo.logo = attachment.toObject();
    await domain.save();
    await DomainManager.removeFromCache(domain.toJSON() as any);

    return { success: true, media: [attachment.toObject()] };
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return { success: false, error: error.message || "Upload failed" };
  }
}

export async function removeLogo(mediaId: string): Promise<RemoveMediaResult> {
  try {
    const ctx = await getActionContext();
    const domain = await DomainModel.findOne({ name: ctx.domainData.domainObj.name });
    if (!domain) throw new ValidationException("Domain not found");
    if (!domain.siteInfo?.logo) throw new ValidationException("Logo not found");

    await getStorageProvider(domain.siteInfo.logo.storageProvider).deleteFile(domain.siteInfo.logo);

    domain.siteInfo.logo = undefined;
    await domain.save();
    await DomainManager.removeFromCache(domain.toJSON() as any);

    return { success: true };
  } catch (error: any) {
    console.error("Logo removal error:", error);
    return { success: false, error: error.message || "Removal failed" };
  }
}

