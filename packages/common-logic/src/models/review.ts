
import mongoose from "mongoose";
import { createModel } from "../lib/create-model";
import { entityField, IEntity } from "../lib/entity";
import { AttachmentMediaSchema, IAttachmentMedia } from "./media";
import { orgaizationIdField } from "./organization";

export interface IReview {
    orgId: mongoose.Types.ObjectId;
    title: string;
    content: string;
    rating: number;
    target: IEntity;
    published: boolean;
    featured: boolean;
    featuredImage: IAttachmentMedia;
    tags: mongoose.Types.ObjectId[];
    authorId: mongoose.Types.ObjectId;
}

const ReviewSchema = new mongoose.Schema<IReview>(
    {
        orgId: orgaizationIdField(),
        title: { type: String, required: true },
        content: { type: mongoose.Schema.Types.Mixed, required: true },
        rating: { type: Number, required: true, min: 1, max: 10 },
        target: entityField(),
        published: { type: Boolean, required: true, default: false },
        featured: { type: Boolean, required: true, default: false },
        featuredImage: AttachmentMediaSchema,
        tags: [{ type: String }],
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

ReviewSchema.virtual("author", {
    ref: "User",
    localField: "authorId",
    foreignField: "_id",
    justOne: true,
});

ReviewSchema.index({ orgId: 1, reviewId: 1 }, { unique: true });
ReviewSchema.index({ orgId: 1, target: 1 });
ReviewSchema.index({ orgId: 1, published: 1 });
ReviewSchema.index({ orgId: 1, featured: 1 });
ReviewSchema.index({ orgId: 1, authorId: 1 });

export const ReviewModel = createModel("Review", ReviewSchema);
