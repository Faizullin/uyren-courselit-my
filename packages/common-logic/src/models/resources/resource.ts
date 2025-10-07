import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { entityField, IEntity } from "../../lib/entity";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { AttachmentMediaSchema, IAttachmentMedia } from "../media";
import { orgaizationIdField } from "../organization";

interface IExternalLink {
    url: string;
    text?: string;
}

export const ExternalLinkSchema = new mongoose.Schema<IExternalLink>({
    url: { type: String, required: true },
    text: { type: String, required: false },
}, {
    _id: false,
});

interface IResource {
    orgId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    type: string;
    shortDescription: string;
    content: ITextEditorContent;
    attachments: IAttachmentMedia[];
    entity: IEntity;
    links: IExternalLink[];
}


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