import mongoose from "mongoose";
import { createModel } from "../lib/create-model";
import { entityField } from "../lib/entity";
import { orgaizationIdField } from "../lib/organization";
import { INotification } from "./notification.types";

export const NotificationSchema = new mongoose.Schema<INotification>(
    {
        orgId: orgaizationIdField(),
        message: {
            type: String,
            required: true,
        },
        href: {
            type: String,
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        actor: entityField(),
        target: entityField(),
        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

export const NotificationModel = createModel('Notification', NotificationSchema);

