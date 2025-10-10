import mongoose from "mongoose";
import { ICourse } from "../lms/course.types";
import { IReview } from "../review.types";
import { IUser } from "../user.types";

export interface IWebsiteSettings {
    orgId: mongoose.Types.ObjectId;
    mainPage: {
        showBanner: boolean;
        bannerTitle: string;
        bannerSubtitle: string;
        featuredCourses: Array<{
            courseId: mongoose.Types.ObjectId;
            title: ICourse["title"];
            slug: ICourse["slug"];
            shortDescription: ICourse["shortDescription"];
            level: ICourse["level"];
            durationInWeeks: ICourse["durationInWeeks"];
            featured: ICourse["featured"];
            order: number;
        }>;
        featuredReviews: Array<{
            reviewId: mongoose.Types.ObjectId;
            author: {
                _id: mongoose.Types.ObjectId;
                username: IUser["username"];
                fullName: IUser["fullName"];
                avatar: IUser["avatar"];
            };
            rating: IReview["rating"];
            content: IReview["content"];
            order: number;
        }>;
        showStats: boolean;
        showFeatures: boolean;
        showTestimonials: boolean;
    };
}

