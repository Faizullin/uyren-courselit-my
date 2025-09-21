import { router } from "../../core/trpc";
import { domainRouter } from "./domain";
import { siteInfoRouter } from "./site-info";
import { websiteSettingsRouter } from "./website-settings";

export const siteModuleRouter = router({
  domain: domainRouter,
  siteInfo: siteInfoRouter,
  websiteSettings: websiteSettingsRouter,
});
