import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { AttachmentMediaSchema } from "../media.model";
import { orgaizationIdField } from "../../lib/organization";
import { IPost, IPostMedia } from "./post.types";

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

