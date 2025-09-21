import { createModel } from "@workspace/common-logic";
import {
  CommunityComment,
  CommunityCommentReply,
} from "@workspace/common-models";
import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";
import CommunityMediaSchema from "./CommunityMedia";

export interface InternalCommunityComment
  extends Pick<
    CommunityComment,
    "communityId" | "postId" | "commentId" | "content" | "media"
  > {
  domain: mongoose.Types.ObjectId;
  userId: string;
  likes: string[];
  replies: InternalReply[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InternalReply
  extends Omit<
    CommunityCommentReply,
    "likesCount" | "hasLiked" | "createdAt" | "updatedAt" | "user" | "deleted"
  > {
  userId: string;
  likes: string[];
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const ReplySchema = new mongoose.Schema<InternalReply>(
  {
    userId: { type: String, required: true },
    content: { type: String, required: true },
    media: [CommunityMediaSchema],
    replyId: { type: String, required: true, default: generateUniqueId },
    parentReplyId: { type: String, default: null },
    likes: [String],
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const CommunityCommentSchema = new mongoose.Schema<InternalCommunityComment>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    communityId: { type: String, required: true },
    postId: { type: String, required: true },
    commentId: {
      type: String,
      required: true,
      unique: true,
      default: generateUniqueId,
    },
    content: { type: String, required: true },
    media: [CommunityMediaSchema],
    likes: [String],
    replies: [ReplySchema],
    deleted: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  },
);

CommunityCommentSchema.statics.paginatedFind = async function (
  filter,
  options,
) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const docs = await this.find(filter).skip(skip).limit(limit).exec();
  return docs;
};

CommunityCommentSchema.virtual("user", {
  ref: "User",
  localField: "userId", // The field in this schema to match
  foreignField: "userId", // The field in the 'User' schema to match
  justOne: true, // Populate a single document, not an array
});

const CommunityCommentModel = createModel(
  "CommunityComment",
  CommunityCommentSchema,
);

export default CommunityCommentModel;
