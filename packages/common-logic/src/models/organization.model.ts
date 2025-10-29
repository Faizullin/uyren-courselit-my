import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../lib/create-model";
import { AttachmentMediaSchema } from "./media.model";
import { orgaizationIdField } from "../lib/organization";
import { IDomain, IOrganization, ISiteInfo } from "./organization.types";

const OrganizationSchema = new mongoose.Schema<IOrganization>({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: false },
    email: { type: String, required: true },
    phone: { type: String, required: false },
    address: { type: String, required: false },
}, {
    timestamps: true,
});

const SiteInfoSchema = new mongoose.Schema<ISiteInfo>({
    title: { type: String, required: false },
    subtitle: { type: String, required: false },
    logo: { type: AttachmentMediaSchema, required: false },
    currencyISOCode: { type: String, required: false },
    paymentMethods: { type: Object, required: false },
    codeInjectionHead: { type: String, required: false },
    codeInjectionBody: { type: String, required: false },
    mailingAddress: { type: String, required: false },
    aiHelper: {
        enabled: { type: Boolean, required: false, default: false },
    },
}, {
    _id: false,
    timestamps: false,
});

const DomainSchema = new mongoose.Schema<IDomain>(
    {
        orgId: orgaizationIdField(),
        name: { type: String, required: true },
        siteInfo: { type: SiteInfoSchema, required: false },
        customDomain: { type: String, required: false },
    },
    {
        timestamps: true,
    }
);

export const OrganizationModel = createModel('Organization', OrganizationSchema);
export type IOrganizationHydratedDocument = HydratedDocument<IOrganization>;
export const DomainModel = createModel('Domain', DomainSchema);
export type IDomainHydratedDocument = HydratedDocument<IDomain>;

