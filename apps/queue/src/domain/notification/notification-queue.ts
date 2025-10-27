import { RedisConfig } from "@/core/redis";
import { Queue } from "bullmq";
import { InternalNotification } from "./notification.types";

class NotificationQueueManager {
  private notificationQueue: Queue<InternalNotification>;

  constructor() {
    const redisConfig = RedisConfig.getConnectionOptions();

    this.notificationQueue = new Queue<InternalNotification>("notification", {
      connection: redisConfig,
      //   defaultJobOptions: {
      //     attempts: 3,
      //     removeOnComplete: 50,
      //     removeOnFail: 20,
      //     backoff: {
      //       type: 'exponential',
      //       delay: 2000,
      //     },
      //   },
    });
  }

  async addNotification(data: InternalNotification) {
    return await this.notificationQueue.add(
      "notification",
      data,
      //      {
      //   priority: this.getPriority(data.n),
      // }
    );
  }

  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaiting(),
      this.notificationQueue.getActive(),
      this.notificationQueue.getCompleted(),
      this.notificationQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async close(): Promise<void> {
    await this.notificationQueue.close();
  }

  getQueue() {
    return this.notificationQueue;
  }
}

export const notificationQueueManager = new NotificationQueueManager();
