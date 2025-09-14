import DomainModel, { type Domain } from "@/models/Domain";
import { connectToDatabase } from "@workspace/common-logic";
import { headers } from "next/headers";
import { redis } from "./redis";
import { parseHost } from "./domain-utils";
import { Log } from "@/lib/logger";

export {
  analyzeDomain,
  cleanHost,
  extractSubdomain,
  parseHost,
} from "./domain-utils";

const useRedis = process.env.USE_REDIS === "true";

const mainIdentifiers = [
  "main",
  "localhost",
  "127.0.0.1",
  "85.202.193.94",
  "uyrenai.kz",
  // "uyren-courselit-my-1.loca.lt",
];

export async function getDomainHeaders() {
  const headersList = await headers();
  const identifier = headersList.get("x-domain-identifier") || "";
  return {
    type: (headersList.get("x-domain-type") || "localhost") as
      | "localhost"
      | "subdomain"
      | "custom",
    host: headersList.get("x-domain-host") || "",
    identifier: identifier,
  };
}

export async function getDomainData(
  defaultHeaders?: Awaited<ReturnType<typeof getDomainHeaders>>,
) {
  const domainHeaders = defaultHeaders || (await getDomainHeaders());
  let domainObj: Domain | null = null;

  try {
    if (domainHeaders.identifier === "main") {
      domainObj = await DomainManager.getDomainByName(domainHeaders.identifier);
    } else if (domainHeaders.type === "subdomain" && domainHeaders.identifier) {
      domainObj = await DomainManager.getDomainByName(domainHeaders.identifier);
    } else if (domainHeaders.type === "custom" && domainHeaders.identifier) {
      domainObj = await DomainManager.getDomainByCustomDomain(
        domainHeaders.identifier,
      );
    }
  } catch (error) {
    console.warn("[getDomainData] Domain lookup failed:", error);
  }

  return { headers: domainHeaders, domainObj };
}

export class DomainManager {
  private static readonly CACHE_TTL = 3600;
  private static readonly CACHE_PREFIX = "domain:";

  private static formatDomainForClient(domain: Domain): Omit<
    Domain,
    "settings"
  > & {
    settings: Omit<
      Domain["settings"],
      | "stripeSecret"
      | "stripeWebhookSecret"
      | "paypalSecret"
      | "paytmSecret"
      | "razorpaySecret"
      | "razorpayWebhookSecret"
      | "lemonsqueezyWebhookSecret"
    >;
  } {
    if (!domain) return domain as any;
    const { settings, ...rest } = domain;
    const safeSettings = { ...settings };

    delete safeSettings.stripeSecret;
    delete safeSettings.stripeWebhookSecret;
    delete safeSettings.paypalSecret;
    delete safeSettings.paytmSecret;
    delete safeSettings.razorpaySecret;
    delete safeSettings.razorpayWebhookSecret;
    delete safeSettings.lemonsqueezyWebhookSecret;

    return { ...rest, settings: safeSettings };
  }

  static async getDomainByHost(host: string): Promise<Domain | null> {
    const { cleanHost: clean, subdomain } = parseHost(host);
    if (!clean) return null;

    if (subdomain) {
      const domain = await this.getDomainByName(subdomain);
      if (domain) return domain;
    }
    return await this.getDomainByCustomDomain(clean);
  }

  static async getDomainByName(name: string) {
    const cacheKey = `${this.CACHE_PREFIX}name:${name}`;
    if (useRedis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as Domain;
          return this.formatDomainForClient(parsed);
        }
      } catch (error) {}
    }
    await connectToDatabase();
    const domain = await DomainModel.findOne({ name, deleted: false });
    if (domain) {
      const domainJSON = domain.toJSON();
      await this.setDomainCache(domainJSON);
      return this.formatDomainForClient(domainJSON);
    }
    return null;
  }

  static async getDomainByCustomDomain(
    customDomain: string,
  ): Promise<Domain | null> {
    const cacheKey = `${this.CACHE_PREFIX}custom:${customDomain}`;
    if (useRedis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as Domain;
          return this.formatDomainForClient(parsed);
        }
      } catch (error) {}
    }
    await connectToDatabase();
    const domain = await DomainModel.findOne({ customDomain, deleted: false });
    if (domain) {
      const domainJSON = domain.toJSON();
      await this.setDomainCache(domainJSON);
      return this.formatDomainForClient(domainJSON);
    }
    return null;
  }

  static async setDomainCache(domain: Domain): Promise<void> {
    return await this.cache(domain);
  }

  private static async cache(domain: Domain): Promise<void> {
    try {
      const promises = [];
      const domainJson = JSON.stringify(domain);
      if (useRedis) {
        if (domain.name) {
          promises.push(
            redis.setex(
              `${this.CACHE_PREFIX}name:${domain.name}`,
              this.CACHE_TTL,
              domainJson,
            ),
          );
        }
        if (domain.customDomain) {
          promises.push(
            redis.setex(
              `${this.CACHE_PREFIX}custom:${domain.customDomain}`,
              this.CACHE_TTL,
              domainJson,
            ),
          );
        }
        await Promise.all(promises);
      }
    } catch (error) {
      Log.error("[cache] Redis caching failed: " + error);
    }
  }

  static async removeFromCache(domain: Domain): Promise<void> {
    try {
      const keys = [`${this.CACHE_PREFIX}id:${domain._id}`];
      if (domain.name) keys.push(`${this.CACHE_PREFIX}name:${domain.name}`);
      if (domain.customDomain)
        keys.push(`${this.CACHE_PREFIX}custom:${domain.customDomain}`);
      if (useRedis) {
        await redis.del(...keys);
      }
    } catch (error) {
      Log.error("[removeFromCache] Cache removal failed: " + error);
    }
  }
}

export default DomainManager;
