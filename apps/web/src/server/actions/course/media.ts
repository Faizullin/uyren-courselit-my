"use server";

import { getActionContext } from "@/server/api/core/actions";
import { AuthorizationException, NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { CloudinaryService } from "@/server/services/cloudinary";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import {
    IAttachmentMedia,
    MediaAccessTypeEnum,
} from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { checkPermission } from "@workspace/utils";
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
 * Upload course featured image
 */
export async function uploadFeaturedImage(
    courseId: string,
    formData: FormData,
): Promise<UploadMediaResult> {
    try {
        const ctx = await getActionContext();

        const files = formData.getAll("file") as File[];
        if (!files || files.length === 0) {
            return { success: false, error: "No files provided" };
        }

        const file = files[0]; // Only first file for featured image
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

        // Get course document
        const course = await CourseModel.findOne({
            _id: courseId,
            orgId: ctx.domainData.domainObj.orgId,
        });

        if (!course) {
            throw new NotFoundException("Course", courseId);
        }

        const media = await CloudinaryService.uploadFile(
            {
                file,
                userId: ctx.user._id as mongoose.Types.ObjectId,
                type: "course",
                caption: `Featured image for ${course.title}`,
                access: MediaAccessTypeEnum.PUBLIC,
            },
            ctx.domainData.domainObj as IDomainHydratedDocument,
        );

        // Update course with featured image
        course.featuredImage = media;
        await course.save();

        return {
            success: true,
            media: [media],
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Featured image upload error:", err);
        return {
            success: false,
            error: err.message || "Upload failed",
        };
    }
}

/**
 * Remove course featured image
 */
export async function removeFeaturedImage(
    courseId: string,
): Promise<RemoveMediaResult> {
    try {
        const ctx = await getActionContext();

        if (!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
            throw new AuthorizationException("You are not allowed to remove the featured image of this course");
        }

        const course = await CourseModel.findOne({
            _id: courseId,
            orgId: ctx.domainData.domainObj.orgId,
        });

        if (!course) {
            throw new NotFoundException("Course", courseId);
        }

        if (!course.featuredImage) {
            throw new ValidationException("Featured image not found");
        }

        // Delete from Cloudinary
        try {
            await CloudinaryService.deleteFile(course.featuredImage);
        } catch (error) {
            console.error("Failed to delete from Cloudinary:", error);
        }

        course.featuredImage = null;
        await course.save();

        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return {
            success: false,
            error: err.message || "Removal failed",
        };
    }
}

