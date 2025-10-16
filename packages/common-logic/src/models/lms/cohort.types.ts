import mongoose from "mongoose";

export enum CohortStatusEnum {
    UPCOMING = 'Upcoming',
    LIVE = 'Live',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
}

export interface ICohort {
    orgId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    instructorId: mongoose.Types.ObjectId;
    status: CohortStatusEnum;
    beginDate?: Date;
    endDate?: Date;
    durationInWeeks?: number;
    description?: string;
    inviteCode?: string;
    maxCapacity?: number;
    ownerId: mongoose.Types.ObjectId;
}

