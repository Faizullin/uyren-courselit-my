import { Log } from "@/lib/logger";
import DomainModel, { type Domain } from "@/models/Domain";
import { connectToDatabase } from "@workspace/common-logic";
import { headers } from "next/headers";
import { parseHost } from "./domain-utils";
import { BaseCacheManager, RedisNotUsedError } from "./redis";

export {
  analyzeDomain,
  cleanHost,
  extractSubdomain,
  parseHost
} from "./domain-utils";

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

export class DomainManager extends BaseCacheManager {
  private static readonly CACHE_TTL = 3600;
  private static readonly CACHE_PREFIX = "domain:";
  private static readonly MANAGER_NAME = "DomainManager";

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

    return await this.handleRedisOperation(
      async () => {
        const cached = await this.getFromCache<Domain>(cacheKey, this.MANAGER_NAME);
        if (cached) {
          return this.formatDomainForClient(cached);
        }
        throw new RedisNotUsedError(this.MANAGER_NAME);
      },
      async () => {
        await connectToDatabase();
        const domain = await DomainModel.findOne({ name, deleted: false });
        if (domain) {
          const domainJSON = domain.toJSON();
          await this.setDomainCache(domainJSON);
          return this.formatDomainForClient(domainJSON);
        }
        return null;
      },
      this.MANAGER_NAME
    );
  }

  static async getDomainByCustomDomain(customDomain: string) {
    const cacheKey = `${this.CACHE_PREFIX}custom:${customDomain}`;

    return await this.handleRedisOperation(
      async () => {
        const cached = await this.getFromCache<Domain>(cacheKey, this.MANAGER_NAME);
        if (cached) {
          return this.formatDomainForClient(cached);
        }
        throw new RedisNotUsedError(this.MANAGER_NAME);
      },
      async () => {
        await connectToDatabase();
        const domain = await DomainModel.findOne({ customDomain, deleted: false });
        if (domain) {
          const domainJSON = domain.toJSON();
          await this.setDomainCache(domainJSON);
          return this.formatDomainForClient(domainJSON);
        }
        return null;
      },
      this.MANAGER_NAME
    );
  }

  static async setDomainCache(domain: Domain): Promise<void> {
    return await this.cache(domain);
  }

  private static async cache(domain: Domain): Promise<void> {
    try {
      const promises = [];
      if (domain.name) {
        promises.push(
          this.setCache(
            `${this.CACHE_PREFIX}name:${domain.name}`,
            domain,
            this.CACHE_TTL,
            this.MANAGER_NAME
          )
        );
      }
      if (domain.customDomain) {
        promises.push(
          this.setCache(
            `${this.CACHE_PREFIX}custom:${domain.customDomain}`,
            domain,
            this.CACHE_TTL,
            this.MANAGER_NAME
          )
        );
      }
      await Promise.all(promises);
    } catch (error) {
      if (error instanceof RedisNotUsedError) {
        return;
      }
      Log.error(`[${this.MANAGER_NAME}] Redis caching failed:`, error as Error);
    }
  }

  static async removeFromCache(domain: Domain): Promise<void> {
    const keys = [`${this.CACHE_PREFIX}id:${domain._id}`];
    if (domain.name) keys.push(`${this.CACHE_PREFIX}name:${domain.name}`);
    if (domain.customDomain)
      keys.push(`${this.CACHE_PREFIX}custom:${domain.customDomain}`);

    try {
      await this.deleteFromCache(keys, this.MANAGER_NAME);
    } catch (error) {
      if (error instanceof RedisNotUsedError) {
        return;
      }
      Log.error(`[${this.MANAGER_NAME}] Cache removal failed:`, error as Error);
    }
  }
}

export default DomainManager;
