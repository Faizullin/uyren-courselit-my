import { router } from "../../core/trpc";
import { courseApiPreferenceRouter } from "./course-api-preference";
import { domainRouter } from "./domain";
import { externalApiKeyRouter } from "./external-api-key";
import { organizationRouter } from "./organization";
import { siteInfoRouter } from "./site-info";
import { tagRouter } from "./tag";
import { websiteSettingsRouter } from "./website-settings";

export const siteModuleRouter = router({
  externalApiKey: externalApiKeyRouter,
  courseApiPreference: courseApiPreferenceRouter,
  domain: domainRouter,
  organization: organizationRouter,
  siteInfo: siteInfoRouter,
  websiteSettings: websiteSettingsRouter,
  tag: tagRouter,
});
