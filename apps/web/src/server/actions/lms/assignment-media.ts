"use server";

import { getActionContext } from "@/server/api/core/actions";
import { AuthorizationException, NotFoundException, ValidationException } from "@/server/api/core/exceptions";
import { ListInputSchema } from "@/server/api/core/schema";
import { paginate } from "@/server/api/core/utils";
import { CloudinaryService } from "@/server/services/cloudinary";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { AssignmentModel } from "@workspace/common-logic/models/lms/assignment.model";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { AttachmentModel } from "@workspace/common-logic/models/media.model";
import { IAttachmentMedia, MediaAccessTypeEnum } from "@workspace/common-logic/models/media.types";
import { IDomainHydratedDocument } from "@workspace/common-logic/models/organization.model";
import { checkPermission } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";

interface UploadMediaResult {
    success: boolean;
    media?: IAttachmentMedia;
    error?: string;
}

interface RemoveMediaResult {
    success: boolean;
    error?: string;
}

interface ListMediaResult {
    success: boolean;
    items?: IAttachmentMedia[];
    meta?: {
        skip: number;
        take: number;
    };
    total?: number;
    error?: string;
}

export async function uploadAssignmentMedia(assignmentId: string, formData: FormData): Promise<UploadMediaResult> {
    try {
        const ctx = await getActionContext();
        const file = formData.get("file") as File;
        if (!file) throw new ValidationException("No file provided");

        const assignment = await AssignmentModel.findOne({ 
            _id: assignmentId, 
            orgId: ctx.domainData.domainObj.orgId 
        });
        if (!assignment) throw new NotFoundException("Assignment", assignmentId);

        // Check permissions
        const isAdmin = checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse]);
        const isOwner = assignment.ownerId.toString() === ctx.user._id.toString();
        
        if (!isAdmin && !isOwner) {
            throw new AuthorizationException();
        }

        const attachment = await CloudinaryService.uploadFile(
            {
                file,
                userId: ctx.user._id as mongoose.Types.ObjectId,
                type: "assignment",
                caption: `Attachment for ${assignment.title}`,
                access: MediaAccessTypeEnum.PUBLIC,
                entityType: "assignment",
                entityId: assignmentId,
            },
            ctx.domainData.domainObj as IDomainHydratedDocument,
        );

        // Add to assignment's attachments array
        if (!assignment.attachments) {
            assignment.attachments = [];
        }
        assignment.attachments.push(attachment.toObject());
        await assignment.save();

        return { success: true, media: attachment.toObject() };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Assignment media upload error:", err);
        return { success: false, error: err.message || "Upload failed" };
    }
}

export async function removeAssignmentMedia(assignmentId: string, mediaId: string): Promise<RemoveMediaResult> {
    try {
        const ctx = await getActionContext();
        
        const assignment = await AssignmentModel.findOne({ 
            _id: assignmentId, 
            orgId: ctx.domainData.domainObj.orgId 
        });
        if (!assignment) throw new NotFoundException("Assignment", assignmentId);

        // Check permissions
        const isAdmin = checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse]);
        const isOwner = assignment.ownerId.toString() === ctx.user._id.toString();
        
        if (!isAdmin && !isOwner) {
            throw new AuthorizationException();
        }

        const attachmentToRemove = assignment.attachments?.find(att => att.mediaId === mediaId);
        if (!attachmentToRemove) {
            throw new ValidationException("Attachment not found");
        }

        await CloudinaryService.deleteFile(attachmentToRemove);

        // Remove from assignment's attachments array
        assignment.attachments = assignment.attachments?.filter(att => att.mediaId !== mediaId) || [];
        await assignment.save();

        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Assignment media removal error:", err);
        return { success: false, error: err.message || "Removal failed" };
    }
}

const ExtendedListInputSchema = ListInputSchema.extend({
    filter: z.object({
        courseId: z.string().min(1, "Course ID is required"),
        assignmentId: z.string().optional(),
        mimeType: z.string().optional(),
    }),
});

export async function listAssignmentMedia(input: z.infer<typeof ListInputSchema>): Promise<ListMediaResult> {
    try {
        const ctx = await getActionContext();
        const validatedInput = ExtendedListInputSchema.parse(input);
        const paginationMeta = paginate(validatedInput.pagination);

        // Check course access (courseId is now required)
        const course = await CourseModel.findOne({ 
            _id: validatedInput.filter.courseId, 
            orgId: ctx.domainData.domainObj.orgId 
        });
        
        if (!course) throw new NotFoundException("Course", validatedInput.filter.courseId);

        const isAdmin = checkPermission(ctx.user.permissions, [UIConstants.permissions.manageAnyCourse]);
        const isOwner = course.ownerId.toString() === ctx.user._id.toString();
        const isInstructor = course.instructors?.some(
            instructor => instructor.userId.toString() === ctx.user._id.toString()
        ) || false;

        if (!isAdmin && !isOwner && !isInstructor) {
            throw new AuthorizationException();
        }

        const query: RootFilterQuery<typeof AttachmentModel> = {
            orgId: ctx.domainData.domainObj.orgId,
            "entity.entityType": "assignment",
        };

        // If assignmentId is provided, filter by specific assignment
        if (validatedInput.filter.assignmentId) {
            query["entity.entityId"] = new mongoose.Types.ObjectId(validatedInput.filter.assignmentId);
        } else {
            // Otherwise, get all assignments for the course
            const assignments = await AssignmentModel.find({ 
                courseId: course._id,
                orgId: ctx.domainData.domainObj.orgId 
            }).select("_id").lean();
            
            const assignmentIds = assignments.map(a => a._id);
            query["entity.entityId"] = { $in: assignmentIds };
        }

        if (validatedInput.filter.mimeType) {
            query.mimeType = { $regex: validatedInput.filter.mimeType, $options: "i" };
        }

        if (validatedInput.search?.q) {
            query.$or = [
                { originalFileName: { $regex: validatedInput.search.q, $options: "i" } },
                { caption: { $regex: validatedInput.search.q, $options: "i" } },
            ];
        }

        const sortField = validatedInput.orderBy?.field || "createdAt";
        const sortDirection = validatedInput.orderBy?.direction === "asc" ? 1 : -1;

        const [items, total] = await Promise.all([
            AttachmentModel.find(query)
                .sort({ [sortField]: sortDirection })
                .skip(paginationMeta.skip)
                .limit(paginationMeta.take)
                .lean(),
            paginationMeta.includePaginationCount ? AttachmentModel.countDocuments(query) : Promise.resolve(0),
        ]);

        return {
            success: true,
            items: items.map(item => ({
                mediaId: item.mediaId,
                orgId: item.orgId,
                storageProvider: item.storageProvider,
                url: item.url,
                originalFileName: item.originalFileName,
                mimeType: item.mimeType,
                size: item.size,
                access: item.access,
                thumbnail: item.thumbnail,
                caption: item.caption,
                file: item.file,
                metadata: item.metadata,
                ownerId: item.ownerId,
            })),
            meta: paginationMeta,
            total: total,
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("List assignment media error:", err);
        return { success: false, error: err.message || "Failed to list media" };
    }
}

