import { HydratedDocument, Types } from "mongoose";

export enum AgentRunStatusEnum {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REVERTED = "reverted"
}

export interface IAgentRun {
  _id?: Types.ObjectId;
  orgId: Types.ObjectId;
  agentType: string;
  entityType: string;
  entityId: Types.ObjectId;
  status: AgentRunStatusEnum;
  metadata: Record<string, any>;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  metrics: {
    duration: number;
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
  };
  outcome: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IAgentRunHydratedDocument = HydratedDocument<IAgentRun>;

