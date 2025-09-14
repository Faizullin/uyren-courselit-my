import WebsiteSettingsModel from "@/models/WebsiteSettings";
import { WebsiteSettings } from "@workspace/common-models";
import { connectToDatabase } from "@workspace/common-logic";
import { redis } from "./redis";
import { Log } from "@/lib/logger";

const useRedis = process.env.USE_REDIS === "true";

export class WebsiteSettingsManager {
    private static readonly CACHE_TTL = 3600; // 1 hour
    private static readonly CACHE_PREFIX = "website_settings:";

    /**
     * Get website settings with automatic Redis/database fallback
     */
    static async get(domainId: string): Promise<WebsiteSettings | null> {
        const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;

        // Try Redis cache first
        if (useRedis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached) as WebsiteSettings;
                    return parsed;
                }
            } catch (error) {
                Log.error("[WebsiteSettingsManager.get] Redis cache read failed:", error as Error);
            }
        }

        // Fallback to database
        try {
            await connectToDatabase();
            const settings = await WebsiteSettingsModel.findOne({
                domain: domainId,
            }).lean();

            if (settings) {
                // Cache the result
                await this.cache(domainId, settings);
                return settings;
            }

            return null;
        } catch (error) {
            Log.error("[WebsiteSettingsManager.get] Database query failed:", error as Error);
            return null;
        }
    }

    /**
     * Get or create website settings (returns existing or creates default)
     */
    static async getOrCreate(domainId: string): Promise<WebsiteSettings> {
        let settings = await this.get(domainId);
        
        if (!settings) {
            settings = await this.createDefault(domainId);
        }
        
        return settings;
    }

    /**
     * Create default website settings for a domain
     */
    private static async createDefault(domainId: string): Promise<WebsiteSettings> {
        const defaultSettings: Partial<WebsiteSettings> & {
            domain: any;
        } = {
            domain: domainId,
            mainPage: {
                showBanner: true,
                bannerTitle: "Welcome to Our Learning Platform",
                bannerSubtitle: "Discover amazing courses and grow your skills",
                featuredCourses: [],
                featuredReviews: [],
                showStats: true,
                showFeatures: true,
                showTestimonials: true,
            },
        };

        try {
            await connectToDatabase();
            const created = await WebsiteSettingsModel.create(defaultSettings);
            const createdJson = created.toJSON();
            
            // Cache the result
            await this.cache(domainId, createdJson);
            
            return createdJson;
        } catch (error) {
            Log.error("[WebsiteSettingsManager.createDefault] Database operation failed:", error as Error);
            throw error;
        }
    }

    /**
     * Add website settings to Redis cache
     */
    static async add(domainId: string, settings: WebsiteSettings): Promise<void> {
        await this.cache(domainId, settings);
    }

    /**
     * Remove website settings from Redis cache
     */
    static async remove(domainId: string): Promise<void> {
        if (!useRedis) return;

        try {
            const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;
            await redis.del(cacheKey);
        } catch (error) {
            Log.error("[WebsiteSettingsManager.remove] Cache removal failed:", error as Error);
        }
    }

    /**
     * Cache website settings in Redis
     */
    private static async cache(domainId: string, settings: WebsiteSettings): Promise<void> {
        if (!useRedis) return;

        try {
            const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;
            const settingsJson = JSON.stringify(settings);

            await redis.setex(cacheKey, this.CACHE_TTL, settingsJson);
        } catch (error) {
            Log.error("[WebsiteSettingsManager.cache] Redis caching failed:", error as Error);
        }
    }

    /**
     * Invalidate cache for a domain (useful when settings are updated)
     */
    static async invalidateCache(domainId: string): Promise<void> {
        await this.remove(domainId);
    }
}

export default WebsiteSettingsManager;
