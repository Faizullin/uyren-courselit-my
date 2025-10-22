import { redis, RedisNotUsedError } from "./redis";

/**
 * Rate limiter that uses Redis when available, falls back to in-memory
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

class RateLimiter {
  private inMemoryTracker = new Map<string, number[]>();
  private config: RateLimitConfig;
  private useRedis: boolean;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      keyPrefix: config.keyPrefix || "ratelimit",
    };
    this.useRedis = process.env.USE_REDIS === "true";
  }

  /**
   * Clean up old entries from in-memory tracker
   */
  private cleanupMemory(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.inMemoryTracker.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < this.config.windowMs
      );
      if (validTimestamps.length === 0) {
        this.inMemoryTracker.delete(key);
      } else {
        this.inMemoryTracker.set(key, validTimestamps);
      }
    }
  }

  /**
   * Check using Redis
   */
  private async checkRedis(identifier: string): Promise<boolean> {
    try {
      const key = `${this.config.keyPrefix}:${identifier}`;
      const count = await redis.incr(key);
      
      if (count === 1) {
        // First request, set expiry
        await redis.pexpire(key, this.config.windowMs);
      }
      
      return count <= this.config.maxRequests;
    } catch (error) {
      console.error("Redis rate limit check failed, using in-memory fallback:", error);
      return this.checkMemory(identifier);
    }
  }

  /**
   * Check using in-memory storage
   */
  private checkMemory(identifier: string): boolean {
    this.cleanupMemory();
    const now = Date.now();
    const timestamps = this.inMemoryTracker.get(identifier) || [];
    const recentTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );
    return recentTimestamps.length < this.config.maxRequests;
  }

  /**
   * Record using in-memory storage
   */
  private recordMemory(identifier: string): void {
    const now = Date.now();
    const timestamps = this.inMemoryTracker.get(identifier) || [];
    timestamps.push(now);
    this.inMemoryTracker.set(identifier, timestamps);
  }

  /**
   * Check if a request is allowed
   * @param identifier - Unique identifier (e.g., user ID, email, IP)
   * @returns Promise<boolean> - true if request is allowed, false otherwise
   */
  async check(identifier: string): Promise<boolean> {
    if (this.useRedis) {
      try {
        return await this.checkRedis(identifier);
      } catch (error) {
        if (error instanceof RedisNotUsedError) {
          return this.checkMemory(identifier);
        }
        throw error;
      }
    }
    return this.checkMemory(identifier);
  }

  /**
   * Check and record a request in one call
   * @param identifier - Unique identifier
   * @returns Promise<boolean> - true if request is allowed (and recorded), false otherwise
   */
  async checkAndRecord(identifier: string): Promise<boolean> {
    if (this.useRedis) {
      // Redis incr is atomic, so check and record are combined
      return await this.check(identifier);
    }
    
    // For in-memory, check first then record
    if (this.checkMemory(identifier)) {
      this.recordMemory(identifier);
      return true;
    }
    return false;
  }
}

// Default rate limiter for form submissions (3 requests per hour)
export const submissionRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyPrefix: "submit",
});

// Export the class for custom rate limiters
export { RateLimiter };
export type { RateLimitConfig };

