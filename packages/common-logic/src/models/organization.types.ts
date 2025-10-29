import mongoose from "mongoose";
import { IAttachmentMedia } from "./media.types";

export interface IOrganization {
    name: string;
    slug: string;
    description?: string;
    email: string;
    phone?: string;
    address?: string;
}

export interface IStripePaymentMethodData {
    type: "stripe";
    stripeKey?: string;
    stripeSecret?: string;
    stripeWebhookSecret?: string;
}

export interface ISiteInfo {
    title?: string;
    subtitle?: string;
    logo?: IAttachmentMedia;
    currencyISOCode?: string;
    paymentMethods?: {
        stripe?: IStripePaymentMethodData;
    };
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    mailingAddress?: string;
    aiHelper: {
        enabled: boolean;
    }
}

export interface IDomain {
    orgId: mongoose.Types.ObjectId;
    name: string;
    customDomain?: string;
    siteInfo?: ISiteInfo;
}

