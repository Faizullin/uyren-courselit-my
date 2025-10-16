import { router } from "../../core/trpc";
import { apiKeyRouter } from "./api-key";
import { domainRouter } from "./domain";
import { externalApiKeyRouter } from "./external-api-key";
import { organizationRouter } from "./organization";
import { siteInfoRouter } from "./site-info";
import { tagRouter } from "./tag";
import { websiteSettingsRouter } from "./website-settings";

export const siteModuleRouter = router({
  apiKey: apiKeyRouter,
  externalApiKey: externalApiKeyRouter,
  domain: domainRouter,
  organization: organizationRouter,
  siteInfo: siteInfoRouter,
  websiteSettings: websiteSettingsRouter,
  tag: tagRouter,
});
