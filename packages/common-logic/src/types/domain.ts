import { type ISiteInfo } from "../models/organization";

type ICroppedSiteInfo = Omit<ISiteInfo, "paymentMethods"> & {
    paymentMethods: {
        stripe: Pick<ISiteInfo["paymentMethods"]["stripe"], "stripeKey" | "type">;
    };
};

export interface IPublicDomain {
    objectId: string;
    name: string;
    customDomain?: string;
    siteInfo: ICroppedSiteInfo;
}