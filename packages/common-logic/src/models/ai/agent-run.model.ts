import mongoose, { Schema, Model } from "mongoose";
import { IAgentRun, IAgentRunHydratedDocument, AgentRunStatusEnum } from "./agent-run.types";

const AgentRunSchema = new Schema<IAgentRun>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    agentType: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { 
      type: String, 
      enum: Object.values(AgentRunStatusEnum),
      default: AgentRunStatusEnum.RUNNING,
      required: true,
      index: true
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    tokens: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    metrics: {
      duration: { type: Number, default: 0 },
      itemsProcessed: { type: Number, default: 0 },
      itemsSucceeded: { type: Number, default: 0 },
      itemsFailed: { type: Number, default: 0 }
    },
    outcome: { type: Schema.Types.Mixed, default: null },
    error: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

AgentRunSchema.index({ orgId: 1, entityType: 1, entityId: 1 });
AgentRunSchema.index({ status: 1, createdAt: -1 });

export const AgentRunModel: Model<IAgentRun, {}, {}, {}, IAgentRunHydratedDocument> =
  (mongoose.models.AgentRun as Model<IAgentRun, {}, {}, {}, IAgentRunHydratedDocument>) ||
  mongoose.model<IAgentRun, Model<IAgentRun, {}, {}, {}, IAgentRunHydratedDocument>>(
    "AgentRun",
    AgentRunSchema,
    "agentruns"
  );

