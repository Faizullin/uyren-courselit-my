import { trpcCaller } from "@/server/api/caller";
import { cache } from "react";

export const getCachedCourseData = cache(async (courseId: string) => {
    const initialCourseData = await trpcCaller.lmsModule.courseModule.course.getById({
        id: courseId,
    });
    const courseData = {
        _id: initialCourseData._id.toString(),
        title: initialCourseData.title,
        shortDescription: initialCourseData.shortDescription,
        level: initialCourseData.level,
        status: initialCourseData.status,
        language: initialCourseData.language,
        owner: {
            _id: initialCourseData.owner._id.toString(),
            username: initialCourseData.owner.username,
        },
        tags: initialCourseData.tags.map((tag) => ({
            _id: tag._id.toString(),
            name: tag.name,
        })),
        chapters: initialCourseData.chapters.map((chapter) => ({
            _id: chapter._id.toString(),
            title: chapter.title,
            description: chapter.description,
        })),
        orgId: initialCourseData.orgId.toString(),
        published: initialCourseData.published,
        featuredImage: initialCourseData.featuredImage ? {
            _id: initialCourseData.featuredImage.mediaId,
            url: initialCourseData.featuredImage.url,
            alt: initialCourseData.featuredImage.originalFileName,
            mimeType: initialCourseData.featuredImage.mimeType,
            size: initialCourseData.featuredImage.size,
            access: initialCourseData.featuredImage.access,
        } : undefined,
        themeId: initialCourseData.themeId ? initialCourseData.themeId.toString() : undefined,
    }
    return courseData;
});


export const getCachedCoursePublicData = cache(async (courseId: string) => {
    const initialCourseData = await trpcCaller.lmsModule.courseModule.course.publicGetById({
        id: courseId,
    });
    const courseData = {
        _id: initialCourseData._id.toString(),
        title: initialCourseData.title,
        shortDescription: initialCourseData.shortDescription,
        level: initialCourseData.level,
        status: initialCourseData.status,
        language: initialCourseData.language,
        tags: initialCourseData.tags.map((tag) => ({
            _id: tag._id.toString(),
            name: tag.name,
        })),
        chapters: initialCourseData.chapters.map((chapter) => ({
            _id: chapter._id.toString(),
            title: chapter.title,
            description: chapter.description,
        })),
        orgId: initialCourseData.orgId.toString(),
        published: initialCourseData.published,
        featuredImage: initialCourseData.featuredImage ? {
            _id: initialCourseData.featuredImage.mediaId,
            url: initialCourseData.featuredImage.url,
            alt: initialCourseData.featuredImage.originalFileName,
            mimeType: initialCourseData.featuredImage.mimeType,
            size: initialCourseData.featuredImage.size,
            access: initialCourseData.featuredImage.access,
        } : undefined,
        owner: {
            _id: initialCourseData.owner._id.toString(),
            username: initialCourseData.owner.username,
        },
        themeId: initialCourseData.themeId ? initialCourseData.themeId.toString() : undefined,
    }
    return courseData;
});
