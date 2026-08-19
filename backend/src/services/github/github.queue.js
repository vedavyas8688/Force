import { Queue } from "bullmq";
import { getRedisConnection } from "../../config/redis.js";

let githubSyncQueue;

export function getGithubSyncQueue() {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!githubSyncQueue) {
    githubSyncQueue = new Queue("github-sync", {
      connection,
    });
  }
  return githubSyncQueue;
}

export async function enqueueGithubSyncJob(name, data) {
  const queue = getGithubSyncQueue();

  if (!queue) {
    const { processGithubSyncJob } = await import("./github-sync.worker-service.js");
    return processGithubSyncJob({ name, data });
  }

  return queue.add(name, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}
