import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl ? new Redis(redisUrl, { maxRetriesPerRequest: 2 }) : null;

export const cacheKeys = {
  userState: (userId: string) => `brainbolt:user:${userId}`,
  questionPool: (difficulty: number) => `brainbolt:questions:${difficulty}`
};
