import mongoose from "mongoose";
import { createModel } from "../lib/create-model";
import { AttachmentMediaSchema, IAttachmentMedia } from "./media";

interface IOrganization {
    name: string;
    slug: string;
    description: string;
    email: string;
    phone: string;
    address: string;
}

export const OrganizationSchema = new mongoose.Schema<IOrganization>({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
}, {
    timestamps: true,
});

export const orgaizationIdField = () => {
    return {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    }
}

interface IStripePaymentMethodData {
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
    paymentMethods: {
        stripe: IStripePaymentMethodData;
    };
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    mailingAddress?: string;
}

export interface IDomain {
    orgId: mongoose.Types.ObjectId;
    name: string;
    customDomain?: string;
    siteInfo: ISiteInfo;
}

const SiteInfoSchema = new mongoose.Schema<ISiteInfo>({
    title: { type: String, required: false },
    subtitle: { type: String, required: false },
    logo: { type: AttachmentMediaSchema, required: false },
    currencyISOCode: { type: String, required: false },
    paymentMethods: { type: Object, required: false },
    codeInjectionHead: { type: String, required: false },
    codeInjectionBody: { type: String, required: false },
    mailingAddress: { type: String, required: false },
}, {
    _id: false,
    timestamps: false,
});

export const DomainSchema = new mongoose.Schema<IDomain>(
    {
        orgId: orgaizationIdField(),
        name: { type: String, required: true },
        siteInfo: { type: SiteInfoSchema, required: true },
        customDomain: { type: String, required: false },
    },
    {
        timestamps: true,
    }
);

export const OrganizationModel = createModel('Organization', OrganizationSchema);
export const DomainModel = createModel('Domain', DomainSchema);