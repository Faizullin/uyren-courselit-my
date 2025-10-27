import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { SupResourceService } from "@workspace/ai-bot/vercel-spbs/server";

export const maxDuration = 30;

const resourceService = new SupResourceService();
let isInitialized = false;

async function initializeService() {
  if (!isInitialized) {
    await resourceService.initialize();
    isInitialized = true;
  }
}

interface SearchResult {
  content: string;
  metadata: {
    id: number;
    pageId: number;
    heading: string;
    title?: string;
  };
  score: number;
}

async function searchInTarget(
  query: string,
  target: { targetType: string; targetId: string },
  topK: number = 5
): Promise<SearchResult[]> {
  const results = await resourceService.searchSimilar(query, topK, target);
  console.log(`[AI CHAT] Searching in ${target.targetType} ${target.targetId}:`, results.length, "results");
  return results;
}

function buildContextFromResults(results: SearchResult[]): string {
  const contextParts = results.map((item: any, idx: number) => {
    const source = [];
    if (item.metadata?.title) source.push(`Title: ${item.metadata.title}`);
    if (item.metadata?.heading) source.push(`Topic: ${item.metadata.heading}`);
    
    return `Source ${idx + 1}:
${source.join('\n')}
Relevance Score: ${(item.score * 100).toFixed(1)}%
Content: ${item.content}`;
  });

  return contextParts.join("\n\n---\n\n");
}

export async function POST(req: Request) {
  try {
    const { messages, courseId, lessonId } = await req.json();

    if (!courseId) {
      return Response.json({ error: "Course ID is required" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Messages array is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const target = lessonId
      ? { targetType: "lesson", targetId: lessonId }
      : { targetType: "course", targetId: courseId };

    await initializeService();

    let systemPrompt = "You are a helpful assistant that behaves like AI and answers questions based on given materials. Provide helpful and effective responses. Not too short, not too long.";
    let hasContext = false;

    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const userQuery = latestMessage?.parts?.find((p: any) => p.type === "text")?.text || latestMessage?.content || "";

      if (userQuery) {
        try {
          const results = await searchInTarget(userQuery, target, 5);
          
          console.log("[AI CHAT] Search results:", results.map((r: any) => ({
            heading: r.metadata?.heading,
            score: r.score,
            contentLength: r.content?.length
          })));
          
          if (results.length > 0) {
            hasContext = true;
            const context = buildContextFromResults(results);

            systemPrompt = `You are a helpful assistant that behaves like AI and answers questions based on given materials. Provide helpful and effective responses using the provided context. Not too short, not too long.

Context from materials:
${context}

Instructions:
- Use the provided sources to give a comprehensive and accurate answer
- Answer should not be too long or too short
- Base your answer on the content above
- If there is no relevant data to the query in the provided context, say "I don't have any data about that in this ${lessonId ? 'lesson' : 'course'}. This topic may be covered in other resources on uyren.ai"
- Reference specific topics from the context when relevant`;
          } else {
            systemPrompt = `You are a helpful assistant. This ${lessonId ? 'lesson' : 'course'} doesn't have any materials indexed yet. Politely inform the user that content is not yet available and suggest they check back later or contact their instructor.`;
          }
        } catch (error) {
          console.error("[AI CHAT] RAG search error:", error);
          systemPrompt = `You are a helpful assistant. There was an error accessing materials. Provide a general helpful response and suggest the user try again later.`;
        }
      }
    }
    

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI chat error:", error);
    return Response.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
