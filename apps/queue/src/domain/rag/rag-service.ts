import { SupFaissService } from "@workspace/ai-bot/vercel-spbs/server";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { logger } from "@/core/logger";

export const supFaissService = new SupFaissService();
supFaissService.initialize();

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

function mapResourcesFromService(resources: any[]): RagResource[] {
  return resources.map((resource) => ({
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
    logger.error({ error }, "Error extracting text");
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

export class RagService {
  async getResourcesByTarget(targetType: string, targetId: string, orgId: string): Promise<RagResource[]> {
    try {
      const resources = await supFaissService.getResourcesByTarget(targetType, targetId);
      return mapResourcesFromService(resources);
    } catch (error) {
      logger.error({ error }, "Error fetching RAG resources");
      throw error;
    }
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    try {
      await supFaissService.deleteResource(resourceId);
      return true;
    } catch (error) {
      logger.error({ error }, "Error deleting RAG resource");
      throw error;
    }
  }

  async syncCourseWithLessons(courseId: string, orgId: string): Promise<SyncResult> {
    try {
      const course = await CourseModel.findOne({ _id: courseId, orgId }).lean();
      if (!course) {
        return {
          success: false,
          courseSynced: false,
          lessonsSynced: 0,
          lessonsDeleted: 0,
          error: "Course not found",
        };
      }

      const lessons = await LessonModel.find({ courseId, orgId }).lean();
      const existingResources = await supFaissService.getResourcesByTarget("course", courseId);

      const currentTargetIds = new Set<string>();
      currentTargetIds.add(courseId);
      lessons.forEach((lesson: any) => currentTargetIds.add(lesson._id.toString()));

      const resourcesToDelete: string[] = [];
      for (const resource of existingResources) {
        if (!currentTargetIds.has(resource.target_id)) {
          resourcesToDelete.push(resource.id.toString());
        }
      }

      for (const resourceId of resourcesToDelete) {
        await supFaissService.deleteResource(resourceId);
      }

      let courseSynced = false;
      let lessonsSyncedCount = 0;
      let coursePageId: number | undefined;

      const courseContent = formatContentForRAG(course.title, course.description);

      if (courseContent && courseContent.length > course.title.length + 10) {
        await supFaissService.addResource({
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

        const { data: coursePage } = await supFaissService.supabaseClient
          .schema('rag')
          .from('nods_page')
          .select('id')
          .eq('target_type', 'course')
          .eq('target_id', courseId)
          .single();

        coursePageId = coursePage?.id;
      }

      for (const lesson of lessons) {
        const lessonContent = formatContentForRAG(lesson.title, lesson.content);

        if (lessonContent && lessonContent.length > lesson.title.length + 10) {
          await supFaissService.addResource({
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

      return {
        success: true,
        courseSynced,
        lessonsSynced: lessonsSyncedCount,
        lessonsDeleted: resourcesToDelete.length,
      };
    } catch (error) {
      logger.error({ error }, "Error syncing course with lessons");
      return {
        success: false,
        courseSynced: false,
        lessonsSynced: 0,
        lessonsDeleted: 0,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  async searchSimilar(query: string, limit: number = 5) {
    try {
      return await supFaissService.searchSimilar(query, limit);
    } catch (error) {
      logger.error({ error }, "Error searching RAG");
      return [];
    }
  }

  async searchSimilarSupabase(
    query: string, 
    limit: number = 5, 
    target?: { targetType: string; targetId: string }
  ) {
    try {
      return await supFaissService.searchSimilarSupabase(query, limit, target);
    } catch (error) {
      logger.error({ error }, "Error searching RAG with Supabase");
      return [];
    }
  }
}

export const ragService = new RagService();

