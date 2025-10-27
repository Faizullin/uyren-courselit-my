import { logger } from "@/core/logger";
import { notificationEmitter } from "@/domain/notification/emitters/notification";
import { addNotificationJob } from "@/domain/notification/handler";
import { verifyJWTMiddleware } from "@/middlewares/verify-jwt";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import { NotificationModel } from "@workspace/common-logic/models/notification.model";

const router: Router = Router();

// Store SSE clients
const sseClients = new Map<string, Set<Response>>();

/**
 * POST /api/notifications
 * Queue a notification for a user
 */
router.post(
  "/api/job/notification",
  verifyJWTMiddleware,
  async (req: Request, res: Response) => {
    const { user } = req;
    console.log("[user]", user, req.body);

    try {
      const { forUserIds, entityAction, entityId, entityTargetId } = req.body;

      for (const forUserId of forUserIds) {
        const notification = await NotificationModel.create({
          orgId: new ObjectId(user!.domain),
          message: `${entityAction} on ${entityId}`,
          href: `/entity/${entityId}`,
          senderId: new ObjectId(user!.userId),
          recipientId: new ObjectId(forUserId),
        });

        await addNotificationJob({
          orgId: user!.domain,
          message: notification.message,
          href: notification.href,
          senderId: user!.userId,
          recipientId: forUserId,
        });
      }

      res.status(200).json({ message: "Success" });
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: (err as any).message });
    }
  },
);

// /**
//  * GET /api/notifications/stream/:userId
//  * SSE endpoint for real-time notifications
//  */
// router.get("/notifications/stream/:userId", (req: any, res: any) => {
//   const { userId } = req.params;

//   if (!userId) {
//     return res.status(400).json({
//       error: "User ID is required",
//     });
//   }

//   // Set up SSE headers
//   res.writeHead(200, {
//     "Content-Type": "text/event-stream",
//     "Cache-Control": "no-cache",
//     Connection: "keep-alive",
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Headers": "Cache-Control",
//   });

//   // Send initial connection message
//   res.write(
//     `data: ${JSON.stringify({
//       type: "connected",
//       message: `Notification stream connected for user ${userId}`,
//       timestamp: new Date().toISOString(),
//     })}\n\n`
//   );

//   // Add client to notification emitter
//   notificationEmitter.addClient(userId, res);

//   // Send heartbeat every 30 seconds
//   const heartbeatInterval = setInterval(() => {
//     try {
//       res.write(
//         `data: ${JSON.stringify({
//           type: "heartbeat",
//           timestamp: new Date().toISOString(),
//         })}\n\n`
//       );
//     } catch (error) {
//       clearInterval(heartbeatInterval);
//     }
//   }, 30000);

//   // Clean up on disconnect
//   req.on("close", () => {
//     clearInterval(heartbeatInterval);
//     notificationEmitter.removeClient(userId, res);
//   });

//   req.on("error", () => {
//     clearInterval(heartbeatInterval);
//     notificationEmitter.removeClient(userId, res);
//   });
// });

/**
 * GET /sse/:userId
 * SSE endpoint for real-time notifications
 */
router.get("/sse/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      error: "User ID is required",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Listen for new notifications from the worker
  const notificationHandler = (notification: any) => {
    if (notification.forUserId === userId) {
      res.write(
        `data: ${JSON.stringify(notification.notificationId || notification._id)}\n\n`,
      );
    }
  };

  notificationEmitter.on("newNotification", notificationHandler);

  const cleanup = () => {
    notificationEmitter.removeListener("newNotification", notificationHandler);
    res.end();
  };

  // Clean up on disconnect
  req.on("close", cleanup);
  req.on("error", cleanup);
});

export { router as notificationRouter };
