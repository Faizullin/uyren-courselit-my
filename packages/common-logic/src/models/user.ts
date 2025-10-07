import mongoose, { HydratedDocument } from "mongoose";
import { createModel } from "../lib/create-model";
import { AttachmentMediaSchema, IAttachmentMedia } from "./media";
import { orgaizationIdField } from "./organization";

interface IUserProviderData {
    provider: string; // e.g., "firebase", "google", "github"
    uid: string; // provider-specific user ID
    name?: string; // provider-specific name
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


export const UserSchema = new mongoose.Schema<IUser>(
    {
        orgId: orgaizationIdField(),
        email: {
            type: String,
            required: true,
            validate: {
                validator: function (v: string) {
                    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
                },
                message: 'Please enter a valid email'
            }
        },
        active: { type: Boolean, required: true, default: true },
        username: { type: String, required: false },
        firstName: { type: String, required: false },
        lastName: { type: String, required: false },
        fullName: { type: String, required: false },
        bio: { type: String },
        permissions: [String],
        roles: [String],
        subscribedToUpdates: { type: Boolean, default: true },
        avatar: AttachmentMediaSchema,
        invited: { type: Boolean },
        providerData: {
            type: {
                provider: { type: String, required: true },
                uid: { type: String, required: true },
                name: { type: String },
            },
            required: false,
        },
    },
    {
        timestamps: true,
    },
);

UserSchema.index({
    email: "text",
    fullName: "text",
});

UserSchema.index(
    {
        orgId: 1,
        email: 1,
    },
    { unique: true },
);

// Pre-save hook to set fullName
UserSchema.pre('save', function (next) {
    if (this.firstName || this.lastName) {
        this.fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
    next();
});

export const UserModel = createModel('User', UserSchema);
export type IUserHydratedDocument = HydratedDocument<IUser>;