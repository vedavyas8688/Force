import "dotenv/config";
import { Worker } from "bullmq";
import { connectDatabase } from "../config/database.js";
import { getRedisConnection } from "../config/redis.js";
import { markNotificationDelivered } from "../services/notifications/notification.service.js";

const connection = getRedisConnection();

if (!connection) {
  console.log("[notification-worker] REDIS_URL is not configured; worker not started");
  process.exit(0);
}

await connectDatabase();

const worker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "dispatch") {
      await markNotificationDelivered(job.data.notificationId);
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[notification-worker] completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[notification-worker] failed ${job?.id}:`, err.message);
});
