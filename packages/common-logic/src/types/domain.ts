import { type ISiteInfo, IStripePaymentMethodData } from "../models/organization.types";

type ICroppedSiteInfo = Omit<ISiteInfo, "paymentMethods"> & {
    paymentMethods?: {
        stripe?: Pick<IStripePaymentMethodData, "stripeKey" | "type">;
    };
};

export interface IPublicDomain {
    objectId: string;
    name: string;
    customDomain?: string;
    siteInfo: ICroppedSiteInfo;
}