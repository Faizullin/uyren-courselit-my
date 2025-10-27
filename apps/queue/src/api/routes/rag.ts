import { Router, Request, Response } from "express";
import { ragService } from "@/domain/rag/rag-service";
import { logger } from "@/core/logger";

const router: Router = Router();

router.get("/api/rag/resources/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const orgId = req.query.orgId as string;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: "Target type and ID are required" });
    }

    const resources = await ragService.getResourcesByTarget(targetType, targetId, orgId || "");
    res.json({ success: true, resources });
  } catch (error) {
    logger.error({ error }, "Error fetching RAG resources");
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.delete("/api/rag/resources/:resourceId", async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;

    if (!resourceId) {
      return res.status(400).json({ error: "Resource ID is required" });
    }

    await ragService.deleteResource(resourceId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting RAG resource");
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

router.post("/api/rag/sync", async (req: Request, res: Response) => {
  try {
    const { courseId, orgId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    if (!orgId) {
      return res.status(401).json({ error: "Organization ID not found" });
    }

    const result = await ragService.syncCourseWithLessons(courseId, orgId);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Error syncing course");
    res.status(500).json({ error: "Failed to sync course" });
  }
});

router.post("/api/rag/search", async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await ragService.searchSimilar(query, limit);
    res.json({ success: true, results });
  } catch (error) {
    logger.error({ error }, "Error searching RAG");
    res.status(500).json({ error: "Failed to search" });
  }
});

export { router as ragRouter };

