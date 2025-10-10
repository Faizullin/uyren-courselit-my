import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField } from "../../lib/entity";
import { AttachmentMediaSchema } from "../media.model";
import { orgaizationIdField } from "../../lib/organization";
import { IExternalLink, IResource } from "./resource.types";

export const ExternalLinkSchema = new mongoose.Schema<IExternalLink>({
    url: { type: String, required: true },
    text: { type: String, required: false },
}, {
    _id: false,
});

export const ResourceSchema = new mongoose.Schema<IResource>(
    {
        orgId: orgaizationIdField(),
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        type: { type: String, required: true },
        shortDescription: { type: String, required: true },
        content: { type: mongoose.Schema.Types.Mixed, required: true },
        attachments: [AttachmentMediaSchema],
        entity: entityField(),
        links: { type: [ExternalLinkSchema], required: true, default: [] },
    },
    {
        timestamps: true,
    },
);

ResourceSchema.virtual("user", {
    ref: "User",
    localField: "ownerId",
    foreignField: "_id",
});

export const ResourceModel = createModel('Resource', ResourceSchema);
export type IResourceHydratedDocument = HydratedDocument<IResource>;

