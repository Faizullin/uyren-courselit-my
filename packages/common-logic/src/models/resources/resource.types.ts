import mongoose from "mongoose";
import { IEntity } from "../../lib/entity";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { IAttachmentMedia } from "../media.types";

export interface IExternalLink {
    url: string;
    text?: string;
}

export interface IResource {
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

