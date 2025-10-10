import mongoose from "mongoose";

export interface ITag {
    orgId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    createdAt?: Date;
    updatedAt?: Date;
}

