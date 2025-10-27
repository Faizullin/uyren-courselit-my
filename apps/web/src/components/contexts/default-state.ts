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
    logo: undefined,
    currencyISOCode: "KZT",
  },
  config: {
    useNotificationsStream: false,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    queueServer: process.env.NEXT_PUBLIC_QUEUE_SERVER || "",
  },
};
