import { InternalNotification } from "./notification.types";
import { MailJob } from "./mail-job.types";
import { notificationQueueManager } from "./notification-queue";
import { mailQueueManager } from "./mail-queue";

export async function addNotificationJob(notification: InternalNotification) {
  await notificationQueueManager.addNotification(notification);
}

export async function addMailJob(mailJob: MailJob) {
  await mailQueueManager.addMailJob(mailJob);
}
