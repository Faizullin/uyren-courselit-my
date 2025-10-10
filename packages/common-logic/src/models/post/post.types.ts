import mongoose from "mongoose";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { IAttachmentMedia } from "../media.types";

export type IPostMedia = {
    type: "attachment-media";
    media?: IAttachmentMedia;
} | {
    type: "youtube" | "pdf" | "image" | "video" | "gif";
    url: string;
}

export interface IPost {
    orgId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    type: string;
    shortDescription: string;
    content: ITextEditorContent;
    category: string;
    attachments: IPostMedia[];
    pinned: boolean;
    commentsCount: number;
    likesCount: number;
}

