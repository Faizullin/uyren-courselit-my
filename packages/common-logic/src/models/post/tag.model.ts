import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { ITag } from "./tag.types";

const TagSchema = new mongoose.Schema<ITag>(
    {
        orgId: orgaizationIdField(),
        name: { type: String, required: true },
        slug: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

TagSchema.index({ name: 'text' });
TagSchema.index({ orgId: 1, slug: 1 }, { unique: true });

export const TagModel = createModel('Tag', TagSchema);
export type ITagHydratedDocument = HydratedDocument<ITag>;

