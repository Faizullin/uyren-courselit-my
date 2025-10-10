import mongoose from "mongoose";
import { IAttachmentMedia } from "./media.types";

export interface IUserProviderData {
    provider: string;
    uid: string;
    name?: string;
}

export interface IUser {
    orgId: mongoose.Types.ObjectId;
    email: string;
    active: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    bio?: string;
    permissions: string[];
    roles: string[];
    subscribedToUpdates: boolean;
    avatar?: IAttachmentMedia;
    invited?: boolean;
    providerData?: IUserProviderData;
    createdAt: number;
    updatedAt: number;
}

