import { ISiteInfo } from "@workspace/common-logic/models/organization.types";

type IServiceConfig = {
  useNotificationsStream: boolean;
  turnstileSiteKey: string;
  queueServer: string;
};
export const defaultState: {
  siteinfo: ISiteInfo; 
  config: IServiceConfig;
} = {
  siteinfo: {
    title: "Uyren AI",
    subtitle: "AI-Powered Learning",
    logo: undefined,
  },
  config: {
    useNotificationsStream: false,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    queueServer: process.env.QUEUE_SERVER || "",
  },
};
