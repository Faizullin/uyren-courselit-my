import { Log } from "@/lib/logger";
import WebsiteSettingsModel from "@/models/WebsiteSettings";
import { connectToDatabase } from "@workspace/common-logic";
import { WebsiteSettings } from "@workspace/common-models";
import { BaseCacheManager, RedisNotUsedError } from "./redis";

export class WebsiteSettingsManager extends BaseCacheManager {
    private static readonly CACHE_TTL = 3600; // 1 hour
    private static readonly CACHE_PREFIX = "website_settings:";
    private static readonly MANAGER_NAME = "WebsiteSettingsManager";

    /**
     * Get website settings with automatic Redis/database fallback
     */
    static async get(domainId: string): Promise<WebsiteSettings | null> {
        const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;

        return await this.handleRedisOperation(
            async () => {
                const cached = await this.getFromCache<WebsiteSettings>(cacheKey, this.MANAGER_NAME);
                if (cached) {
                    return cached;
                }
                throw new RedisNotUsedError(this.MANAGER_NAME);
            },
            async () => {
                await connectToDatabase();
                const tmp = await WebsiteSettingsModel.findOne({
                    domain: domainId,
                }).lean();
                const settings = JSON.parse(JSON.stringify(tmp));

                if (settings) {
                    // Cache the result
                    await this.cache(domainId, settings);
                    return settings;
                }

                return null;
            },
            this.MANAGER_NAME
        );
    }

    /**
     * Get or create website settings (returns existing or creates default)
     */
    static async getOrCreate(domainId: string) {
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
            const tmp = created.toJSON();
            const createdJson = JSON.parse(JSON.stringify(tmp));
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
        const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;

        try {
            await this.deleteFromCache([cacheKey], this.MANAGER_NAME);
        } catch (error) {
            if (error instanceof RedisNotUsedError) {
                ;
                return;
            }
            Log.error(`[${this.MANAGER_NAME}] Cache removal failed:`, error as Error);
        }
    }

    /**
     * Cache website settings in Redis
     */
    private static async cache(domainId: string, settings: WebsiteSettings): Promise<void> {
        const cacheKey = `${this.CACHE_PREFIX}domain:${domainId}`;

        try {
            await this.setCache(cacheKey, settings, this.CACHE_TTL, this.MANAGER_NAME);
        } catch (error) {
            if (error instanceof RedisNotUsedError) {
                return;
            }
            Log.error(`[${this.MANAGER_NAME}] Redis caching failed:`, error as Error);
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
