import mongoose from "mongoose";

export const orgaizationIdField = () => {
    return {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    }
}