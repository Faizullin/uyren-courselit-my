import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { ITextEditorContent } from "../../lib/text-editor-content";
import { AttachmentMediaSchema, IAttachmentMedia } from "../media";
import { orgaizationIdField } from "../organization";


type IPostMedia = {
    type: "attachment-media";
    media?: IAttachmentMedia;
} | {
    type: "youtube" | "pdf" | "image" | "video" | "gif";
    url: string;
}


interface IPost {
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


const postMediaSchema = new mongoose.Schema<IPostMedia>({
    type: { type: String, required: true },
    media: { type: AttachmentMediaSchema, required: false },
    url: { type: String, required: false },
}, {
    _id: false,
    timestamps: true,
});

export const PostSchema = new mongoose.Schema<IPost>(
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
        category: String,
        attachments: [postMediaSchema],
        pinned: { type: Boolean, default: false },
        commentsCount: { type: Number, default: 0, min: 0 },
        likesCount: { type: Number, default: 0, min: 0 },
    },
    {
        timestamps: true,
    },
);

PostSchema.virtual("user", {
    ref: "User",
    localField: "ownerId",
    foreignField: "_id",
});

export const PostModel = createModel('Post', PostSchema);