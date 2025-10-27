import { Router, Request, Response } from "express";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, Message, streamText } from "ai";
import { ragService } from "@/domain/rag/rag-service";
import { logger } from "@/core/logger";

const router: Router = Router();

router.post("/ai/chat/course", async (req: Request, res: Response) => {
  try {
    const { courseId, messages } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    let systemPrompt = "You are a helpful assistant. Provide helpful and effective responses. Not too short, not too long.";

    logger.info({ courseId }, "[COURSE AI CHAT] Starting");

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const userQuery = lastMessage?.parts?.find((p: any) => p.type === "text")?.text || "";

      if (userQuery) {
        try {
          const results = await ragService.searchSimilar(userQuery, 3);

          logger.info({ resultsCount: results.length }, "[COURSE AI CHAT] Results count");

          if (results.length > 0) {
            const context = results
              .map((item: any, idx: number) => `Source ${idx + 1}:\nTopic: ${item.metadata?.heading || 'N/A'}\nContent: ${item.content}`)
              .join("\n\n---\n\n");

            systemPrompt = `You are a helpful assistant. Provide helpful and effective responses using the provided context. Not too short, not too long.

Context from course materials:
${context}

Provide a helpful answer based on the course content. If the question cannot be answered with the provided context, mention from what field that information comes from and suggest to take courses from uyren.ai to get knowledge about that topic.`;
          }
        } catch (ragError) {
          logger.error({ error: ragError }, 'RAG error');
        }
      }
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: convertToCoreMessages(messages as Message[]),
      temperature: 0.7,
    });

    const stream = result.toDataStreamResponse();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = stream.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: "Failed to create stream" });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (error) {
    logger.error({ error }, "AI chat error");
    return res.status(500).json({ error: "Failed to process chat request" });
  }
});

export { router as aiChatRouter };

