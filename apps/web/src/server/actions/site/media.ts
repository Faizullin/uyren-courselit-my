"use server";

import { getActionContext } from "@/server/api/core/actions";
import { ValidationException } from "@/server/api/core/exceptions";
import DomainManager from "@/server/lib/domain";
import { CloudinaryService } from "@/server/services/cloudinary";
import {
  IAttachmentMedia,
  MediaAccessTypeEnum,
} from "@workspace/common-logic/models/media.types";
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

/**
 * Upload logo image
 */
export async function uploadLogo(
  formData: FormData,
): Promise<UploadMediaResult> {
  try {
    const ctx = await getActionContext();

    const files = formData.getAll("file") as File[];
    if (!files || files.length === 0) {
      return { success: false, error: "No files provided" };
    }

    const file = files[0]; // Only first file for logo
    if (!file) {
      throw new ValidationException("No file provided");
    }
    const maxSize = 5 * 1024 * 1024; // 5MB for images

    // Validate image only
    if (!file.type.startsWith("image/")) {
      throw new ValidationException("Only image files are allowed");
    }

    if (file.size > maxSize) {
      throw new ValidationException("Image must be less than 5MB");
    }

    // Get domain document
    const domain = await DomainModel.findOne({
      name: ctx.domainData.domainObj.name,
    });
    if (!domain) {
      throw new ValidationException("Domain not found");
    }

    const media = await CloudinaryService.uploadFile(
      {
        file,
        userId: ctx.user._id as mongoose.Types.ObjectId,
        type: "domain",
        caption: "Site logo",
        access: MediaAccessTypeEnum.PUBLIC,
      },
      domain as IDomainHydratedDocument,
    );

    // Update siteInfo with logo
    if (!domain.siteInfo) {
      domain.siteInfo = {} as ISiteInfo;
    }

    domain.siteInfo.logo = media;
    await domain.save();
    await DomainManager.removeFromCache(domain);

    return {
      success: true,
      media: [media],
    };
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
}

/**
 * Remove media file
 */
export async function removeMedia(mediaId: string): Promise<RemoveMediaResult> {
  try {
    await getActionContext(); // Validate auth & domain

    // Delete from Cloudinary
    try {
      await CloudinaryService.deleteFile(mediaId);
    } catch (error) {
      console.error("Failed to delete from Cloudinary:", error);
      return {
        success: false,
        error: "Failed to delete media file",
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Media removal error:", error);
    return {
      success: false,
      error: error.message || "Removal failed",
    };
  }
}

