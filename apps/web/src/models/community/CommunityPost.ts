import { createModel } from "@workspace/common-logic";
import { CommunityPost } from "@workspace/common-models";
import { generateUniqueId } from "@workspace/utils";
import mongoose from "mongoose";
import CommunityMediaSchema from "./CommunityMedia";

export interface InternalCommunityPost
  extends Pick<
    CommunityPost,
    | "title"
    | "communityId"
    | "postId"
    | "content"
    | "category"
    | "media"
    | "pinned"
    | "commentsCount"
    | "deleted"
  > {
  domain: mongoose.Types.ObjectId;
  userId: string;
  likes: string[];
  createdAt: string;
  updatedAt: string;
}

const CommunityPostSchema = new mongoose.Schema<InternalCommunityPost>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    communityId: { type: String, required: true },
    postId: {
      type: String,
      required: true,
      unique: true,
      default: generateUniqueId,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: String,
    media: [CommunityMediaSchema],
    pinned: { type: Boolean, default: false },
    commentsCount: { type: Number, default: 0, min: 0 },
    likes: [String],
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

CommunityPostSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
});

const CommunityPostModel = createModel("CommunityPost", CommunityPostSchema);

export default CommunityPostModel;
