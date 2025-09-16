import Redis from "ioredis";
import { Log } from "@/lib/logger";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  username: process.env.REDIS_USERNAME || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

const useRedis = process.env.USE_REDIS === "true";

export class RedisNotUsedError extends Error {
  constructor(managerName: string) {
    super(`Redis not used in ${managerName}`);
    this.name = "RedisNotUsedError";
  }
}

export abstract class BaseCacheManager {
  protected static readonly DEFAULT_CACHE_TTL = 3600;

  protected static checkRedisAvailability(managerName: string): void {
    if (!useRedis) {
      throw new RedisNotUsedError(managerName);
    }
  }

  protected static async getFromCache<T>(cacheKey: string, managerName: string): Promise<T | null> {
    try {
      this.checkRedisAvailability(managerName);
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      if (error instanceof RedisNotUsedError) {
        throw error;
      }
      Log.error(`[${managerName}] Redis cache read failed:`, error as Error);
      return null;
    }
  }

  protected static async setCache(
    cacheKey: string, 
    data: any, 
    ttl: number, 
    managerName: string
  ): Promise<void> {
    try {
      this.checkRedisAvailability(managerName);
      const dataJson = JSON.stringify(data);
      await redis.setex(cacheKey, ttl, dataJson);
    } catch (error) {
      if (error instanceof RedisNotUsedError) {
        throw error;
      }
      Log.error(`[${managerName}] Redis caching failed:`, error as Error);
    }
  }

  protected static async deleteFromCache(cacheKeys: string[], managerName: string): Promise<void> {
    try {
      this.checkRedisAvailability(managerName);
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
    } catch (error) {
      if (error instanceof RedisNotUsedError) {
        throw error;
      }
      Log.error(`[${managerName}] Cache removal failed:`, error as Error);
    }
  }

  protected static async handleRedisOperation<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    managerName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof RedisNotUsedError && error.message.includes("not used")) {
        return await fallbackOperation();
      }
      throw error;
    }
  }
}
