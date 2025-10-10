import mongoose from "mongoose";
import { IEntity } from "../lib/entity";

export interface IActivity {
    orgId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    actor?: IEntity;
    type: string;
    entity?: IEntity;
    metadata?: Record<string, any>;
    message?: string;
}

