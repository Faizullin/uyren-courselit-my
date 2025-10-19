"use server";

import { getActionContext } from "@/server/api/core/actions";
import { ValidationException } from "@/server/api/core/exceptions";
import { CloudinaryService } from "@/server/services/cloudinary";
import { IAttachmentMedia, MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { UserModel } from "@workspace/common-logic/models/user.model";
import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";

interface UploadAvatarResult {
    success: boolean;
    avatar?: IAttachmentMedia;
    error?: string;
}

export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResult> {
    try {
        const ctx = await getActionContext();
        const file = formData.get("file") as File;
        if (!file) throw new ValidationException("No file provided");
        if (!file.type.startsWith("image/")) throw new ValidationException("Only image files are allowed");
        if (file.size > 5 * 1024 * 1024) throw new ValidationException("File size exceeds 5MB limit");

        const user = await UserModel.findOne({ _id: ctx.user._id, orgId: ctx.domainData.domainObj.orgId });
        if (!user) throw new ValidationException("User not found");

        const attachment = await CloudinaryService.uploadFile(
            {
                file,
                userId: ctx.user._id as mongoose.Types.ObjectId,
                type: "avatars",
                caption: "Profile picture",
                access: MediaAccessTypeEnum.PUBLIC,
                entityType: "user",
                entityId: ctx.user._id,
            },
            ctx.domainData.domainObj as IDomainHydratedDocument,
        );

        user.avatar = attachment.toObject();
        await user.save();

        return { success: true, avatar: attachment.toObject() };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Avatar upload error:", err);
        return { success: false, error: err.message || "Upload failed" };
    }
}

export async function removeAvatar(): Promise<UploadAvatarResult> {
    try {
        const ctx = await getActionContext();
        const user = await UserModel.findOne({ _id: ctx.user._id, orgId: ctx.domainData.domainObj.orgId });
        if (!user) throw new ValidationException("User not found");
        if (!user.avatar) throw new ValidationException("Avatar not found");

        await CloudinaryService.deleteFile(user.avatar);

        user.avatar = undefined;
        await user.save();

        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Avatar removal error:", err);
        return { success: false, error: err.message || "Removal failed" };
    }
}

export async function setGoogleAvatar(photoURL: string): Promise<UploadAvatarResult> {
    try {
        const ctx = await getActionContext();
        const user = await UserModel.findOne({ _id: ctx.user._id, orgId: ctx.domainData.domainObj.orgId });
        if (!user) throw new ValidationException("User not found");

        const googleAvatar: IAttachmentMedia = {
            mediaId: generateUniqueId(),
            orgId: ctx.domainData.domainObj.orgId,
            ownerId: ctx.user._id as mongoose.Types.ObjectId,
            storageProvider: "custom",
            url: photoURL,
            originalFileName: "google_profile_picture",
            mimeType: "image/jpeg",
            size: 0,
            access: MediaAccessTypeEnum.PUBLIC,
            thumbnail: photoURL,
            caption: "Google profile picture",
        };

        user.avatar = googleAvatar;
        await user.save();

        return { success: true, avatar: googleAvatar };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Google avatar set error:", err);
        return { success: false, error: err.message || "Failed to set Google avatar" };
    }
}

