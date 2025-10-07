import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { AttachmentMediaSchema, IAttachmentMedia } from "../media";
import { orgaizationIdField } from "../organization";

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

interface IChatMessage {
    orgId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;

    // Message content
    content: string;
    type: ChatMessageTypeEnum;
    status: ChatMessageStatusEnum;

    // Sender
    senderId: mongoose.Types.ObjectId;

    // Reply/Thread
    replyToId?: mongoose.Types.ObjectId;
    threadId?: mongoose.Types.ObjectId;

    // Attachments
    attachments: IAttachmentMedia[];

    // Metadata
    editedAt?: Date;
    deletedAt?: Date;
    readByUserIds: mongoose.Types.ObjectId[];
}

export const ChatMessageSchema = new mongoose.Schema<IChatMessage>({
    orgId: orgaizationIdField(),
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatRoom",
        required: true,
        index: true,
    },

    // Message content
    content: {
        type: String,
        required: true,
        maxlength: 4000,
    },
    type: {
        type: String,
        required: true,
        enum: ChatMessageTypeEnum,
        default: ChatMessageTypeEnum.TEXT,
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: ChatMessageStatusEnum,
        default: ChatMessageStatusEnum.SENT,
        index: true,
    },

    // Sender
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    // Reply/Thread
    replyToId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatMessage",
        required: false,
        index: true,
    },
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatMessage",
        required: false,
        index: true,
    },

    // Attachments
    attachments: {
        type: [AttachmentMediaSchema],
        default: [],
    },

    // Metadata
    editedAt: {
        type: Date,
        required: false,
    },
    deletedAt: {
        type: Date,
        required: false,
    },
    readByUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }],
}, {
    timestamps: true,
});

// Indexes
ChatMessageSchema.index({ orgId: 1, roomId: 1 });
ChatMessageSchema.index({ roomId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1, createdAt: -1 });
ChatMessageSchema.index({ replyToId: 1 });
ChatMessageSchema.index({ threadId: 1 });
ChatMessageSchema.index({ orgId: 1, type: 1 });
ChatMessageSchema.index({ status: 1, createdAt: -1 });

// Virtual for sender
ChatMessageSchema.virtual('sender', {
    ref: 'User',
    localField: 'senderId',
    foreignField: '_id',
    justOne: true,
});

// Virtual for room
ChatMessageSchema.virtual('room', {
    ref: 'ChatRoom',
    localField: 'roomId',
    foreignField: '_id',
    justOne: true,
});

// Virtual for reply to message
ChatMessageSchema.virtual('replyTo', {
    ref: 'ChatMessage',
    localField: 'replyToId',
    foreignField: '_id',
    justOne: true,
});


// Virtual for read by users
ChatMessageSchema.virtual('readBy', {
    ref: 'User',
    localField: 'readByUserIds',
    foreignField: '_id',
});

// Create and export model
export const ChatMessageModel = createModel('ChatMessage', ChatMessageSchema);