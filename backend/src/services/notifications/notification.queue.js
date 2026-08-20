import { Queue } from "bullmq";
import { getRedisConnection } from "../../config/redis.js";

let notificationQueue;

export function getNotificationQueue() {
  const connection = getRedisConnection();
  if (!connection) return null;

  if (!notificationQueue) {
    notificationQueue = new Queue("notifications", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 250,
        removeOnFail: 500,
      },
    });
  }

  return notificationQueue;
}

export async function enqueueNotificationDispatch(notificationId) {
  const queue = getNotificationQueue();
  if (!queue) return false;

  await queue.add("dispatch", { notificationId: String(notificationId) });
  return true;
}
