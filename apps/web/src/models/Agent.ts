import { createModel } from "@workspace/common-logic";
import mongoose from "mongoose";

export type AgentScope = "PUBLIC" | "USER";

export type AgentProvider =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "azure-openai"
  | "google"
  | string;

export interface AgentDoc {
  domain: mongoose.Types.ObjectId;
  name: string;
  scope: AgentScope; // PUBLIC agents are domain-wide; USER are owned by creatorId
  provider: AgentProvider;
  model: string;
  baseUrl?: string;
  // For USER-scoped agents
  creatorId?: string; // references User.userId (string), not ObjectId
  // Provider-agnostic settings (non-secret)
  settings?: Record<string, any>;
  // Secret API key stored separately with select:false
  apiKey?: string;
}

const AgentSchema = new mongoose.Schema<AgentDoc>(
  {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    scope: { type: String, required: true, enum: ["PUBLIC", "USER"], default: "USER" },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    baseUrl: { type: String },
    creatorId: { type: String },
    settings: { type: mongoose.Schema.Types.Mixed },
    apiKey: { type: String, select: false },
  },
  { timestamps: true }
);

// Unique agent name within a domain and scope/creator
AgentSchema.index(
  { domain: 1, name: 1, scope: 1, creatorId: 1 },
  { unique: true, partialFilterExpression: { name: { $exists: true } } }
);

const AgentModel = createModel<AgentDoc>("Agent", AgentSchema);

export default AgentModel;