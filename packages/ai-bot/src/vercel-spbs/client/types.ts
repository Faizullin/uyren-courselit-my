import { z } from 'zod';

export const ClientConfigSchema = z.object({
  baseUrl: z.string().url().default('http://localhost:3000/api'),
  timeout: z.number().positive().default(30000),
  retries: z.number().min(0).max(3).default(2),
});

export const ChatRequestSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  context: z.string().optional(),
});

export const ChatResponseSchema = z.object({
  response: z.string(),
  messageId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const SessionCreateSchema = z.object({
  userId: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const SessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  services: z.record(z.boolean()).optional(),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type SessionCreate = z.infer<typeof SessionCreateSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export interface APIError {
  message: string;
  code: string;
  status: number;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}