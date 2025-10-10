import mongoose from "mongoose";
import { IEntity } from "../lib/entity";

export interface INotification {
    orgId: mongoose.Types.ObjectId;
    message: string;
    href: string;
    read: boolean;
    senderId: mongoose.Types.ObjectId;
    recipientId: mongoose.Types.ObjectId;
    actor?: IEntity;
    target?: IEntity;
}

