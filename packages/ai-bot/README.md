# @workspace/ai-bot

AI-powered bot package for RAG (Retrieval Augmented Generation) functionality using Supabase and FAISS vector stores.

## Overview

This package provides AI bot services for semantic search and chat functionality over course content. It supports two vector storage backends:
- **Supabase** (with pgvector extension) - for persistent cloud storage
- **FAISS** - for local/in-memory vector search

All database tables are created in a dedicated `rag` schema to keep RAG-related data organized and isolated from other application data.

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Node Environment
NODE_ENV=development

# Supabase Configuration
NEXT_PUBLIC_RAG_SUPABASE_URL=https://your-project.supabase.co
RAG_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
DEBUG=true
```

### Required Services

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **OpenAI API Key** - Get from [platform.openai.com](https://platform.openai.com)

## Supabase Setup

### 1. Enable pgvector Extension

Run this in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Schema and Tables

Run these commands in Supabase SQL Editor:

```sql
-- Create dedicated schema for RAG
-- Using a separate schema keeps RAG tables organized and isolated from other data
create schema if not exists rag;

-- Stores the checksum of our pages.
-- This ensures that we only regenerate embeddings
-- when the page content has changed.
create table "rag"."nods_page" (
  id bigserial primary key,
  parent_page_id bigint references rag.nods_page,
  path text not null unique,
  checksum text,
  meta jsonb,
  type text,
  source text,
  target_type text,
  target_id text
);

alter table "rag"."nods_page"
  enable row level security;

-- Stores the actual embeddings with some metadata
create table "rag"."nods_page_section" (
  id bigserial primary key,
  page_id bigint not null references rag.nods_page on delete cascade,
  content text,
  token_count int,
  embedding vector(1536),
  slug text,
  heading text
);

alter table "rag"."nods_page_section"
  enable row level security;

-- Create indexes for better performance
create index if not exists nods_page_path_idx on rag.nods_page(path);
create index if not exists nods_page_target_idx on rag.nods_page(target_type, target_id);
create index if not exists nods_page_section_page_id_idx on rag.nods_page_section(page_id);
create index if not exists nods_page_section_embedding_idx on rag.nods_page_section 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Grant permissions to service_role
grant usage on schema rag to service_role;
grant all on all tables in schema rag to service_role;
grant all on all sequences in schema rag to service_role;
```

### 3. Create Search Function (Required)

Create the RPC function for similarity search (required for the API route):

```sql
-- Create function to search similar sections with page info
create or replace function rag.match_page_sections(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  page_id bigint,
  slug text,
  heading text,
  content text,
  similarity float,
  target_type text,
  target_id text
)
language sql stable
as $$
  select
    s.id,
    s.page_id,
    s.slug,
    s.heading,
    s.content,
    1 - (s.embedding <=> query_embedding) as similarity,
    p.target_type,
    p.target_id
  from rag.nods_page_section s
  join rag.nods_page p on s.page_id = p.id
  where 1 - (s.embedding <=> query_embedding) > match_threshold
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
```

### 4. Set Row Level Security (RLS)

Enable RLS for security:

```sql
-- RLS is already enabled in step 2, but here are the policies

-- Create policies for service role (full access)
create policy "Service role full access on nods_page"
  on rag.nods_page
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access on nods_page_section"
  on rag.nods_page_section
  for all
  to service_role
  using (true)
  with check (true);

-- Create policies for authenticated users (read only)
create policy "Authenticated users can read nods_page"
  on rag.nods_page
  for select
  to authenticated
  using (true);

create policy "Authenticated users can read nods_page_section"
  on rag.nods_page_section
  for select
  to authenticated
  using (true);
```

## Usage

### Adding Resources (Server-Side)

Use `SupResourceService` to add course content and generate embeddings:

```typescript
import { SupResourceService } from "@workspace/ai-bot/vercel-spbs/server";

const resourceService = new SupResourceService();
await resourceService.initialize();

// Add course with embeddings
await resourceService.addResource({
  content: "Course content text...",
  metadata: { 
    title: "Course Title", 
    author: "Author Name"
  },
  path: "/courses/course-123",
  type: "course",
  source: "lms",
  targetType: "course",
  targetId: "course-123",
  shouldRefresh: false
});

// Add lesson content
await resourceService.addResource({
  content: "Lesson content about JavaScript...",
  metadata: { 
    title: "Intro to JavaScript",
    lessonId: "lesson-456",
    courseId: "course-123"
  },
  path: "/courses/course-123/lessons/lesson-456",
  type: "lesson",
  source: "lms",
  targetType: "lesson",
  targetId: "lesson-456",
  parentPageId: coursePageId, // Optional: link to parent course
  shouldRefresh: false
});
```

### CRUD Operations

```typescript
// Get resources by target
const resources = await resourceService.getResourcesByTarget("course", "course-123");

// Update resource metadata
await resourceService.updateResource("page-id", { 
  meta: { updated: true },
  checksum: "new-checksum" 
});

// Delete resource
await resourceService.deleteResource("page-id");

// Search similar content
const results = await resourceService.searchSimilar("query text", 5, "course-123");
```

### API Route Integration (Next.js)

Create a streaming AI chat endpoint with RAG:

```typescript
import { embed, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function generateEmbedding(message: string) {
  return embed({
    model: openai.embedding("text-embedding-3-small"),
    value: message,
  });
}

async function fetchRelevantContext(embedding: number[], courseId?: string) {
  const { data, error } = await supabase.rpc("match_page_sections", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 3,
  });

  if (error) throw error;

  let results = data || [];

  if (courseId) {
    const { data: pages } = await supabase
      .schema('rag')
      .from('nods_page')
      .select('id')
      .eq('target_id', courseId);

    const pageIds = new Set((pages || []).map((p: any) => p.id));
    results = results.filter((s: any) => pageIds.has(s.page_id));
  }

  return JSON.stringify(
    results.map(
      (item: any) => `
        Topic: ${item.heading || 'N/A'}
        Content: ${item.content}
        `
    )
  );
}

function createPrompt(context: string, userQuestion: string) {
  return {
    role: "system",
    content: `
      You are a helpful AI assistant. Use the following context to answer questions:
      
      ${context}
      
      Provide helpful answers based on the context. If the context doesn't contain 
      enough information, mention that and provide general guidance.
      
      Question: ${userQuestion}`,
  };
}

export async function POST(req: Request) {
  try {
    const { messages, courseId } = await req.json();
    const latestMessage = messages.at(-1).content;

    const { embedding } = await generateEmbedding(latestMessage);
    const context = await fetchRelevantContext(embedding, courseId);
    const prompt = createPrompt(context, latestMessage);
    
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: [prompt, ...messages],
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
```

## Services

### SupResourceService
Core service for managing RAG resources in Supabase:

**Features:**
- **Add Resources**: Store content with automatic chunking and embedding generation
- **Get Resources**: Retrieve resources by target type and ID
- **Update Resources**: Modify resource metadata and checksums
- **Delete Resources**: Remove resources (sections auto-deleted via CASCADE)
- **Search**: Vector similarity search with optional filtering by course/entity
- **Checksum-based Updates**: Only regenerate embeddings when content changes

**CRUD Methods:**
```typescript
// Create/Add
await service.addResource(props);

// Read
const resources = await service.getResourcesByTarget("course", "course-123");

// Update
await service.updateResource("page-id", { meta: {...}, checksum: "..." });

// Delete
await service.deleteResource("page-id");

// Search
const results = await service.searchSimilar("query", 5, "course-123");
```

### SupFaissService
Extended service with local FAISS vector store support:

**Features:**
- All SupResourceService features
- In-memory FAISS vector store for faster search
- Can save/load FAISS index from disk
- Dual search: Both Supabase and FAISS available
- Ideal for development and testing

**Additional Methods:**
```typescript
// FAISS-specific search
const results = await service.searchSimilar("query", 5);

// Supabase-specific search
const results = await service.searchSimilarSupabase("query", 5, "course-123");

// Save/load FAISS index
await service.saveFaissIndex("/path/to/index");
await service.loadFaissIndex("/path/to/index");
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm check-types

# Lint
pnpm lint
```

## Database Schema

Two main tables in the `rag` schema:

**nods_page:** Stores page metadata
- `target_type` and `target_id`: Link to entities (courses, lessons, etc.)
- `checksum`: Detect content changes to avoid regenerating embeddings

**nods_page_section:** Stores chunks with embeddings
- `embedding`: 1536-dimensional vector (text-embedding-3-small)
- Automatically deleted when parent page is removed (CASCADE)


