"use server";

import { getActionContext } from "@/server/api/core/actions";
import { AuthorizationException, NotFoundException } from "@/server/api/core/exceptions";
import { ListInputSchema } from "@/server/api/core/schema";
import { paginate } from "@/server/api/core/utils";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { AttachmentModel } from "@workspace/common-logic/models/media.model";
import { checkPermission } from "@workspace/utils";
import mongoose, { RootFilterQuery } from "mongoose";
import { z } from "zod";

const ExtendedListInputSchema = ListInputSchema.extend({
    filter: z.object({
        courseId: z.string().min(1, "Course ID is required"),
        lessonId: z.string().optional(),
        mimeType: z.string().optional(),
    }),
});
export async function listLessonMedia(input: z.infer<typeof ListInputSchema>) {
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
            throw new AuthorizationException("You are not allowed to access this course's lesson media");
        }

        const query: RootFilterQuery<typeof AttachmentModel> = {
            orgId: ctx.domainData.domainObj.orgId,
            "entity.entityType": "lesson",
        };

        // If lessonId is provided, filter by specific lesson
        if (validatedInput.filter.lessonId) {
            query["entity.entityId"] = new mongoose.Types.ObjectId(validatedInput.filter.lessonId);
        } else {
            // Otherwise, get all lessons for the course
            const lessons = await LessonModel.find({
                courseId: course._id,
                orgId: ctx.domainData.domainObj.orgId
            }).select("_id").lean();

            const lessonIds = lessons.map(l => l._id);
            query["entity.entityId"] = { $in: lessonIds };
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
                orgId: item.orgId.toString(),
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
                ownerId: item.ownerId.toString(),
            })),
            meta: paginationMeta,
            total: total,
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("List lesson media error:", err);
        return { success: false, error: err.message || "Failed to list media" };
    }
}

