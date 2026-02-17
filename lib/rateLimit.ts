import { redis } from "@/lib/cache";

const bucket = new Map<string, { count: number; windowStart: number }>();

export const checkRateLimit = async (key: string, max: number, windowMs: number) => {
  if (redis) {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    return count <= max;
  }

  const now = Date.now();
  const item = bucket.get(key);
  if (!item || now - item.windowStart >= windowMs) {
    bucket.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (item.count >= max) {
    return false;
  }
  item.count += 1;
  return true;
};
