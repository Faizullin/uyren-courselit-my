"use server";

import { SupResourceService } from "@workspace/ai-bot/vercel-spbs/server";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { checkPermission } from "@workspace/utils";
import { ActionContext, getActionContext } from "../api/core/actions";
import { AuthorizationException, NotFoundException } from "../api/core/exceptions";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";

const resourceService = new SupResourceService();
let isInitialized = false;

async function initializeService() {
  if (!isInitialized) {
    await resourceService.initialize();
    isInitialized = true;
  }
}

function formatContentForRAG(title: string, editorContent: any): string {
  const textContent = extractTextFromEditorContent(editorContent);
  if (!textContent) return `# ${title}`;
  return `# ${title}\n\n${textContent}`.trim();
}

function extractTextFromEditorContent(content: any): string {
  if (!content) return "";
  try {
    if (typeof content === "string") {
      return stripHtml(content);
    }
    if (!content.content || content.content.length === 0) {
      return "";
    }
    return stripHtml(content.content);
  } catch (error) {
    console.error("Error extracting text:", error);
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export interface RagResource {
  id: string;
  path: string;
  type: string;
  targetType: string;
  targetId: string;
  source: string;
  meta: any;
  checksum: string;
  sectionsCount?: number;
}

interface SyncResult {
  success: boolean;
  courseSynced: boolean;
  lessonsSynced: number;
  lessonsDeleted: number;
  error?: string;
}

export async function syncCourseToRAG(courseId: string): Promise<SyncResult> {
  try {
    const ctx = await getActionContext();
    await connectToDatabase();
    await initializeService();


    const course = await CourseModel.findOne({ 
      _id: courseId, 
      orgId: ctx.domainData.domainObj.orgId, 
    }).lean();

    if (!course) {
      throw new NotFoundException("Course", courseId);
    }

    const hasPermission = (checkPermission(
      ctx.user.permissions,
      [UIConstants.permissions.manageAnyCourse]
    ) || (
        checkPermission(
            ctx.user.permissions,
            [UIConstants.permissions.manageCourse]
        ) && ctx.user._id.equals(course.ownerId)
    ) || (
        checkPermission(
            ctx.user.permissions,
            [UIConstants.permissions.manageCourse]
        ) && course.instructors.some((instructor) => instructor.userId.equals(ctx.user._id))
        || ctx.user.roles.includes(UIConstants.roles.admin)
    ));

    if (!hasPermission) {
      throw new AuthorizationException("You don't have permission to sync this course");
    }

    const lessons = await LessonModel.find({ 
      courseId, 
      orgId: ctx.domainData.domainObj.orgId  
    }).lean();

    const existingCoursePages = await resourceService.getResourcesByTarget("course", courseId);
    const existingCoursePage = existingCoursePages.length > 0 ? existingCoursePages[0] : null;
    
    const currentLessonIds = new Set(lessons.map((l) => l._id.toString()));
    const allExistingResources = await resourceService.supabaseClient
      .schema('rag')
      .from('nods_page')
      .select('id, target_id, target_type')
      .eq('target_type', 'lesson')
      .in('target_id', Array.from(currentLessonIds));

    const existingLessonPages = new Map(
      (allExistingResources.data || []).map(r => [r.target_id, r.id])
    );
    
    const resourcesToDelete: string[] = [];
    for (const resource of (allExistingResources.data || [])) {
      if (!currentLessonIds.has(resource.target_id)) {
        resourcesToDelete.push(resource.id.toString());
      }
    }

    for (const resourceId of resourcesToDelete) {
      await resourceService.deleteResource(resourceId);
    }

    console.log(`[RAG SYNC] Deleted ${resourcesToDelete.length} removed resources`);

    let courseSynced = false;
    let lessonsSyncedCount = 0;
    let coursePageId: number | undefined;

    const courseContent = formatContentForRAG(course.title, course.description);

    if (courseContent && courseContent.length > course.title.length + 10) {
      if (existingCoursePage) {
        console.log(`[RAG SYNC] Course page exists, updating: ${course.title}`);
        coursePageId = parseInt(existingCoursePage.id);
      } else {
        console.log(`[RAG SYNC] Course page does not exist, creating: ${course.title}`);
      }

      await resourceService.addResource({
        content: courseContent,
        metadata: { title: course.title, slug: course.slug },
        path: `/courses/${courseId}`,
        type: "course",
        source: "lms",
        shouldRefresh: true,
        targetType: "course",
        targetId: courseId,
      });
      courseSynced = true;

      if (!coursePageId) {
        const { data: coursePage } = await resourceService.supabaseClient
          .schema('rag')
          .from('nods_page')
          .select('id')
          .eq('target_type', 'course')
          .eq('target_id', courseId)
          .single();

        coursePageId = coursePage?.id;
      }
      console.log(`[RAG SYNC] Course page ID: ${coursePageId}`);
    }

    for (const lesson of lessons) {
      const lessonId = lesson._id.toString();
      const existingLessonPageId = existingLessonPages.get(lessonId);
      
      const lessonContent = formatContentForRAG(lesson.title, lesson.content);

      if (lessonContent && lessonContent.length > lesson.title.length + 10) {
        if (existingLessonPageId) {
          console.log(`[RAG SYNC] Lesson page exists, updating: ${lesson.title}`);
        } else {
          console.log(`[RAG SYNC] Lesson page does not exist, creating: ${lesson.title}`);
        }

        await resourceService.addResource({
          content: lessonContent,
          metadata: {
            title: lesson.title,
            slug: lesson.slug,
            courseId: courseId,
            lessonId: lesson._id.toString(),
          },
          path: `/courses/${courseId}/lessons/${lesson._id}`,
          type: "lesson",
          source: "lms",
          shouldRefresh: true,
          targetType: "lesson",
          targetId: lesson._id.toString(),
          parentPageId: coursePageId,
        });
        lessonsSyncedCount++;
      }
    }

    console.log(`[RAG SYNC] Sync complete: ${lessonsSyncedCount} lessons, ${resourcesToDelete.length} deleted`);

    return {
      success: true,
      courseSynced,
      lessonsSynced: lessonsSyncedCount,
      lessonsDeleted: resourcesToDelete.length,
    };
  } catch (error) {
    console.error("[RAG SYNC] Error:", error);
    return {
      success: false,
      courseSynced: false,
      lessonsSynced: 0,
      lessonsDeleted: 0,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

export async function getResourcesByTarget(
  targetType: string,
  targetId: string
): Promise<RagResource[]> {
  try {
    const ctx = await getActionContext();
    await connectToDatabase();
    await initializeService();

    const resources = await resourceService.getResourcesByTarget(targetType, targetId);
    
    return resources.map((resource: any) => ({
      id: resource.id?.toString() || "",
      path: resource.path || "",
      type: resource.type || "",
      targetType: resource.target_type || "",
      targetId: resource.target_id || "",
      source: resource.source || "",
      meta: resource.meta || {},
      checksum: resource.checksum || "",
      sectionsCount: resource.sections_count || 0,
    }));
  } catch (error) {
    console.error("[RAG] Error getting resources:", error);
    return [];
  }
}

export async function deleteRagResource(resourceId: string): Promise<boolean> {
  try {
    const ctx = await getActionContext();
    await connectToDatabase();
    await initializeService();

    await deleteResourceRecursive(resourceId);
    return true;
  } catch (error) {
    console.error("[RAG] Error deleting resource:", error);
    return false;
  }
}

async function deleteResourceRecursive(resourceId: string): Promise<void> {
  const children = await resourceService.supabaseClient
    .schema('rag')
    .from('nods_page')
    .select('id')
    .eq('parent_page_id', resourceId);

  if (children.data && children.data.length > 0) {
    console.log(`[RAG DELETE] Found ${children.data.length} children for resource ${resourceId}`);
    for (const child of children.data) {
      await deleteResourceRecursive(child.id.toString());
    }
  }

  console.log(`[RAG DELETE] Deleting sections for resource ${resourceId}`);
  const { error: sectionsError } = await resourceService.supabaseClient
    .schema('rag')
    .from('nods_page_section')
    .delete()
    .eq('page_id', resourceId);

  if (sectionsError) {
    console.error(`[RAG DELETE] Error deleting sections:`, sectionsError);
    throw sectionsError;
  }

  console.log(`[RAG DELETE] Deleting resource ${resourceId}`);
  const { error: pageError } = await resourceService.supabaseClient
    .schema('rag')
    .from('nods_page')
    .delete()
    .eq('id', resourceId);

  if (pageError) {
    console.error(`[RAG DELETE] Error deleting page:`, pageError);
    throw pageError;
  }
}

