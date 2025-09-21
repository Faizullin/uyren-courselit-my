import { z } from 'zod';

export const BaseMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
});

export const RAGConfigSchema = z.object({
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(1000),
  topP: z.number().min(0).max(1).default(0.9),
  contextWindow: z.number().positive().default(4000),
});

export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  embedding: z.array(z.number()).optional(),
});

export const SearchResultSchema = z.object({
  document: DocumentSchema,
  score: z.number(),
  relevance: z.enum(['high', 'medium', 'low']),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type RAGConfig = z.infer<typeof RAGConfigSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;

export interface VectorStore {
  addDocument(document: Document): Promise<void>;
  searchDocuments(query: string, limit?: number): Promise<SearchResult[]>;
  deleteDocument(id: string): Promise<void>;
}