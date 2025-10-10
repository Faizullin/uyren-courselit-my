import mongoose from "mongoose";
import { IAttachmentMedia } from "../media.types";

export enum ChatMessageTypeEnum {
    TEXT = "text",
    IMAGE = "image",
    FILE = "file",
    SYSTEM = "system",
    ANNOUNCEMENT = "announcement",
}

export enum ChatMessageStatusEnum {
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    EDITED = "edited",
    DELETED = "deleted",
}

export interface IChatMessage {
    orgId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    content: string;
    type: ChatMessageTypeEnum;
    status: ChatMessageStatusEnum;
    senderId: mongoose.Types.ObjectId;
    replyToId?: mongoose.Types.ObjectId;
    threadId?: mongoose.Types.ObjectId;
    attachments: IAttachmentMedia[];
    editedAt?: Date;
    deletedAt?: Date;
    readByUserIds: mongoose.Types.ObjectId[];
}

