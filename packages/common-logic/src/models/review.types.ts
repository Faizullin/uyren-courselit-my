import mongoose from "mongoose";
import { IEntity } from "../lib/entity";
import { IAttachmentMedia } from "./media.types";
import { ITextEditorContent } from "../lib/text-editor-content";

export interface IReview {
    orgId: mongoose.Types.ObjectId;
    title: string;
    content: ITextEditorContent;
    rating: number;
    target: IEntity;
    published: boolean;
    featured: boolean;
    featuredImage: IAttachmentMedia;
    tags: mongoose.Types.ObjectId[];
    authorId: mongoose.Types.ObjectId;
}

