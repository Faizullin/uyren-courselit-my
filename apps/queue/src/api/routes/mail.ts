import express from "express";
import { mailQueueManager } from "@/domain/notification/mail-queue";
import { MailJob } from "@/domain/notification/mail-job.types";
import { logger } from "@/core/logger";
import { verifyJWTMiddleware } from "@/middlewares/verify-jwt";

const router: express.Router = express.Router();

router.post("/api/job/mail", verifyJWTMiddleware, async (req, res) => {
  try {
    const validation = MailJob.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: "Invalid mail data", details: validation.error.errors });
    }

    const job = await mailQueueManager.addMailJob(validation.data);
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    logger.error(
      "Mail job failed: " +
        (error instanceof Error ? error.message : String(error)),
    );
    res.status(500).json({ error: "Failed to add mail job" });
  }
});

router.get("/api/mail/status", verifyJWTMiddleware, async (req, res) => {
  try {
    const stats = await mailQueueManager.getStats();
    res.json({ success: true, queue: stats });
  } catch (error) {
    logger.error(
      "Status failed: " +
        (error instanceof Error ? error.message : String(error)),
    );
    res.status(500).json({ error: "Failed to get status" });
  }
});

export { router as mailRouter };
