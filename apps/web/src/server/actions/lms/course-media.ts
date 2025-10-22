"use server";

import { getActionContext } from "@/server/api/core/actions";
import { AuthorizationException, NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { CloudinaryService } from "@/server/services/cloudinary";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { checkPermission } from "@workspace/utils";
import mongoose from "mongoose";

interface RemoveMediaResult {
    success: boolean;
    error?: string;
}

export async function uploadFeaturedImage(courseId: string, formData: FormData) {
    try {
        const ctx = await getActionContext();
        const files = formData.getAll("file") as File[];
        if (!files || files.length === 0) return { success: false, error: "No files provided" };

        const file = files[0];
        if (!file) throw new ValidationException("No file provided");
        if (!file.type.startsWith("image/")) throw new ValidationException("Only image files are allowed");
        if (file.size > 5 * 1024 * 1024) throw new ValidationException("Image must be less than 5MB");

        const course = await CourseModel.findOne({ _id: courseId, orgId: ctx.domainData.domainObj.orgId });
        if (!course) throw new NotFoundException("Course", courseId);

        const attachment = await CloudinaryService.uploadFile(
            {
                file,
                userId: ctx.user._id as mongoose.Types.ObjectId,
                type: "course",
                caption: `Featured image for ${course.title}`,
                access: MediaAccessTypeEnum.PUBLIC,
                entityType: "course",
                entityId: courseId,
            },
            ctx.domainData.domainObj as IDomainHydratedDocument,
        );

        const media = attachment.toObject();
        course.featuredImage = media;
        await course.save();

        return {
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
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Featured image upload error:", err);
        return { success: false, error: err.message || "Upload failed" };
    }
}

export async function removeFeaturedImage(courseId: string): Promise<RemoveMediaResult> {
    try {
        const ctx = await getActionContext();

        if (!checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse])) {
            throw new AuthorizationException("You are not allowed to remove the featured image of this course");
        }

        const course = await CourseModel.findOne({ _id: courseId, orgId: ctx.domainData.domainObj.orgId });
        if (!course) throw new NotFoundException("Course", courseId);
        if (!course.featuredImage) throw new ValidationException("Featured image not found");

        await CloudinaryService.deleteFile(course.featuredImage);

        course.featuredImage = null;
        await course.save();

        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Featured image removal error:", err);
        return { success: false, error: err.message || "Removal failed" };
    }
}

