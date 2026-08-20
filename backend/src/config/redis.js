import IORedis from "ioredis";

let redisConnection;

export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || "";
  if (!redisUrl || redisUrl.includes("PASTE_")) return null;

  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  return redisConnection;
}
