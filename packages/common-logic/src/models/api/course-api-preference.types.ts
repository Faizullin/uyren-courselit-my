import mongoose from "mongoose";

export interface ICourseApiPreference {
  orgId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  externalApiKeyId: mongoose.Types.ObjectId;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

