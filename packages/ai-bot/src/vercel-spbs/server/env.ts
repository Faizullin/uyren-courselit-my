// env.mjs
import { z } from "zod";
import "dotenv/config";

// Define schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase
  NEXT_PUBLIC_RAG_SUPABASE_URL: z.string().url(),
  RAG_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Optional
  DEBUG: z.string().optional(),
});

// Parse and validate
export const env = envSchema.parse(process.env);
