import mongoose from "mongoose";
import { createModel } from "../lib/create-model";
import { entityField } from "../lib/entity";
import { orgaizationIdField } from "../lib/organization";
import { IActivity } from "./activity.types";

const ActivitySchema = new mongoose.Schema<IActivity>(
    {
        orgId: orgaizationIdField(),
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        actor: entityField({ required: false }),
        type: {
            type: String,
            required: true,
        },
        entity: entityField({ required: false }),
        metadata: {
            type: mongoose.Schema.Types.Mixed, default: {}
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

ActivitySchema.index({ orgId: 1, type: 1 });

export const ActivityModel = createModel("Activity", ActivitySchema);

