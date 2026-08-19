import IORedis from "ioredis";

let redisConnection;

export function getRedisConnection() {
  if (!process.env.REDIS_URL) return null;

  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return redisConnection;
}
