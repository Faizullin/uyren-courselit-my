import mongoose, { Schema } from "mongoose";
import { createModel } from "../../lib/create-model";
import { orgaizationIdField } from "../../lib/organization";
import { IWebsiteSettings } from "./website-settings.types";

const WebsiteSettingsSchema = new mongoose.Schema<IWebsiteSettings>(
    {
        orgId: orgaizationIdField(),
        mainPage: {
            showBanner: { type: Boolean, default: true },
            bannerTitle: { type: String, required: true },
            bannerSubtitle: { type: String },
            featuredCourses: [
                {
                    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
                    title: { type: String, required: true },
                    slug: { type: String, required: true },
                    shortDescription: { type: String },
                    level: {
                        type: String,
                        enum: ["beginner", "intermediate", "advanced"],
                    },
                    durationInWeeks: { type: Number, min: 0 },
                    featured: { type: Boolean, default: false },
                    order: { type: Number, min: 0, default: 0 },
                },
            ],
            featuredReviews: [
                {
                    reviewId: { type: mongoose.Schema.Types.ObjectId, required: true },
                    author: {
                        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
                        username: { type: String },
                        fullName: { type: String, required: true },
                        avatar: { type: Schema.Types.Mixed },
                    },
                    rating: { type: Number, required: true, min: 1, max: 10 },
                    content: {
                        type: Schema.Types.Mixed,
                        required: true,
                    },
                    order: { type: Number, min: 0, default: 0 },
                },
            ],
            showStats: { type: Boolean, default: true },
            showFeatures: { type: Boolean, default: true },
            showTestimonials: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
    });

export const WebsiteSettingsModel = createModel("WebsiteSettings", WebsiteSettingsSchema);

