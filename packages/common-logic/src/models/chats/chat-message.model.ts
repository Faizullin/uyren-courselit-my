import mongoose from "mongoose";
import { createModel } from "../../lib/create-model";
import { AttachmentMediaSchema } from "../media.model";
import { orgaizationIdField } from "../../lib/organization";
import { ChatMessageStatusEnum, ChatMessageTypeEnum, IChatMessage } from "./chat-message.types";

export const ChatMessageSchema = new mongoose.Schema<IChatMessage>({
    orgId: orgaizationIdField(),
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatRoom",
        required: true,
        index: true,
    },
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
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
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
    attachments: {
        type: [AttachmentMediaSchema],
        default: [],
    },
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

ChatMessageSchema.index({ orgId: 1, roomId: 1 });
ChatMessageSchema.index({ roomId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1, createdAt: -1 });
ChatMessageSchema.index({ orgId: 1, type: 1 });
ChatMessageSchema.index({ status: 1, createdAt: -1 });

ChatMessageSchema.virtual('sender', {
    ref: 'User',
    localField: 'senderId',
    foreignField: '_id',
    justOne: true,
});

ChatMessageSchema.virtual('room', {
    ref: 'ChatRoom',
    localField: 'roomId',
    foreignField: '_id',
    justOne: true,
});

ChatMessageSchema.virtual('replyTo', {
    ref: 'ChatMessage',
    localField: 'replyToId',
    foreignField: '_id',
    justOne: true,
});

ChatMessageSchema.virtual('readBy', {
    ref: 'User',
    localField: 'readByUserIds',
    foreignField: '_id',
});

export const ChatMessageModel = createModel('ChatMessage', ChatMessageSchema);

