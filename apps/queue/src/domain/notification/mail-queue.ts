import { RedisConfig } from "@/core/redis";
import { Queue } from "bullmq";
import { MailJob } from "./mail-job.types";

class MailQueueManager {
  private mailQueue: Queue<MailJob>;

  constructor() {
    const redisConfig = RedisConfig.getConnectionOptions();
    this.mailQueue = new Queue<MailJob>("mail", {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 50,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  }

  async addMailJob(data: MailJob): Promise<any> {
    return await this.mailQueue.add("send-mail", data);
  }

  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.mailQueue.getWaiting(),
      this.mailQueue.getActive(),
      this.mailQueue.getCompleted(),
      this.mailQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  getQueue() {
    return this.mailQueue;
  }
}

export const mailQueueManager = new MailQueueManager();
