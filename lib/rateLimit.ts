const bucket = new Map<string, { count: number; windowStart: number }>();

export const checkRateLimit = (key: string, max: number, windowMs: number) => {
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
