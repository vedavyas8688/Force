import "dotenv/config";
import { Worker } from "bullmq";
import { connectDatabase } from "../config/database.js";
import { getRedisConnection } from "../config/redis.js";
import { processGithubSyncJob } from "../services/github/github-sync.worker-service.js";

await connectDatabase();
const connection = getRedisConnection();

if (!connection) {
  console.error("[github-worker] REDIS_URL is required");
  process.exit(1);
}

const worker = new Worker(
  "github-sync",
  async (job) => processGithubSyncJob(job),
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`[github-worker] completed ${job.name}#${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[github-worker] failed ${job?.name}#${job?.id}:`, err.message);
});

console.log("[github-worker] listening for github-sync jobs");
