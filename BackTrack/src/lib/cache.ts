import Redis from 'ioredis';

// Simple in-memory fallback to avoid runtime errors if Redis is unavailable.
const memoryCache = new Map<string, { value: string; expiresAt: number }>();
const DEFAULT_TTL_SECONDS = 300;

function createRedisClient() {
  const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
  if (!url) return null;

  return new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
}

const redis = createRedisClient();

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  // 1) Redis path
  if (redis) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const data = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  // 2) In-memory fallback
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > now) {
    return JSON.parse(cached.value) as T;
  }

  const data = await fetcher();
  memoryCache.set(key, { value: JSON.stringify(data), expiresAt: now + ttlSeconds * 1000 });
  return data;
}

export async function invalidateCache(key: string) {
  if (redis) {
    await redis.del(key);
  }
  memoryCache.delete(key);
}
