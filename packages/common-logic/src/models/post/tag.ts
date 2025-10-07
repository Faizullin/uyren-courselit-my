import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../organization";


export interface ITag {
    orgId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
}

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

export const TagModel = createModel('Tag', TagSchema);
export type ITagHydratedDocument = HydratedDocument<ITag>;