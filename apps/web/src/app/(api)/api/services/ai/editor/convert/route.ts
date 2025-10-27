import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export const maxDuration = 60;
export const runtime = "nodejs";

const allowedExtensions = ["pdf", "docx"] as const;

const RequestSchema = z.object({
  extensions: z.array(z.string()).optional().default(["paragraph", "heading", "bulletList", "orderedList", "table", "image"]),
});

const TiptapNodeSchema: any = z.lazy(() => z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
  content: z.array(TiptapNodeSchema).optional(),
  marks: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.any()).optional(),
  })).optional(),
  text: z.string().optional(),
}));

const TiptapContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(TiptapNodeSchema),
});


interface ExtractedContent {
  text: string;
  images?: { data: string; alt?: string }[];
  tables?: string[][];
}

async function extractContentFromPDF(buffer: ArrayBuffer): Promise<ExtractedContent> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);
    
    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(errData instanceof Error ? errData : new Error(errData.parserError as any));
    });
    
    pdfParser.on("pdfParser_dataReady", () => {
      const text = pdfParser.getRawTextContent();
      resolve({ text });
    });
    
    const fileBuffer = Buffer.from(buffer);
    pdfParser.parseBuffer(fileBuffer);
  });
}

async function extractContentFromDOCX(buffer: ArrayBuffer): Promise<ExtractedContent> {
  const nodeBuffer = Buffer.from(buffer);
  const textResult = await mammoth.extractRawText({ buffer: nodeBuffer });
  return { text: textResult.value };
}

async function convertToTiptapWithAI(
  extractedContent: ExtractedContent,
  enabledExtensions: string[],
  fileName: string
): Promise<any> {
  console.log("[AI CONVERT] Starting conversion");
  console.log("[AI CONVERT] Enabled extensions:", enabledExtensions);
  console.log("[AI CONVERT] Text length:", extractedContent.text.length);
  console.log("[AI CONVERT] Images found:", extractedContent.images?.length || 0);
  console.log("[AI CONVERT] Tables found:", extractedContent.tables?.length || 0);

  const extensionInstructions: Record<string, string> = {
    paragraph: "- Use 'paragraph' type for regular text blocks",
    heading: "- Use 'heading' type with attrs.level (1-6) for headings",
    bulletList: "- Use 'bulletList' with 'listItem' children for bullet points",
    orderedList: "- Use 'orderedList' with 'listItem' children for numbered lists",
    table: "- Use 'table' > 'tableRow' > 'tableCell' structure for tables",
    image: "- Use 'image' type with attrs.src for images (mark with placeholder URL)",
    blockquote: "- Use 'blockquote' for quoted text",
    codeBlock: "- Use 'codeBlock' for code snippets",
    hardBreak: "- Use 'hardBreak' for line breaks",
    bold: "- Use marks: [{ type: 'bold' }] for bold text",
    italic: "- Use marks: [{ type: 'italic' }] for italic text",
  };

  const activeInstructions = enabledExtensions
    .map(ext => extensionInstructions[ext])
    .filter(Boolean)
    .join("\n");

  const prompt = `Convert the following text content into Tiptap JSON format step by step.

STEP 1: Analyze the content structure
- Identify headings, paragraphs, lists, tables
- Note any formatting (bold, italic, etc.)

STEP 2: Use these Tiptap node types (ONLY use enabled extensions):
${activeInstructions}

STEP 3: Build the JSON structure
- Start with type: "doc"
- Add content array with proper nodes
- Nest content correctly (lists have listItems, tables have rows/cells)
- Add text nodes inside content where needed
- Use marks array for formatting (bold, italic, etc.)

Text content to convert:
${extractedContent.text.substring(0, 8000)}${extractedContent.text.length > 8000 ? '\n... (content truncated)' : ''}

${extractedContent.tables && extractedContent.tables.length > 0 ? `\nTables detected: ${extractedContent.tables.length}` : ''}

Return ONLY valid Tiptap JSON. Make it clean and well-structured.`;

  try {
    const result = streamObject({
      model: openai("gpt-4o"),
      schema: TiptapContentSchema,
      prompt,
      temperature: 0.2,
    });

    console.log("[AI CONVERT] Streaming conversion...");
    
    let finalObject;
    for await (const partialObject of result.partialObjectStream) {
      if (partialObject) {
        finalObject = partialObject;
      }
    }

    console.log("[AI CONVERT] Conversion complete");
    console.log("[AI CONVERT] Generated nodes:", finalObject?.content?.length || 0);

    return finalObject;
  } catch (error) {
    console.error("[AI CONVERT] Error:", error);
    throw new Error("Failed to convert text to Tiptap format");
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const extensionsRaw = formData.get("extensions") as string | null;

        if (!file) {
          sendUpdate({ error: "No file provided" });
          controller.close();
          return;
        }

        let enabledExtensions = ["paragraph", "heading", "bulletList", "orderedList", "table", "image"];
        
        if (extensionsRaw) {
          try {
            const parsed = JSON.parse(extensionsRaw);
            const requestValidation = RequestSchema.safeParse({ extensions: parsed });
            if (requestValidation.success) {
              enabledExtensions = requestValidation.data.extensions;
            }
          } catch (error) {
            console.log("[FILE CONVERT] Using default extensions");
          }
        }

        const fileName = file.name;
        const extension = fileName.split(".").pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension as any)) {
          sendUpdate({ error: `Only ${allowedExtensions.join(", ")} files are supported` });
          controller.close();
          return;
        }

        sendUpdate({
          type: "progress",
          step: "Preparing file...",
          progress: 10,
          label: "Initializing"
        });

        const buffer = await file.arrayBuffer();
        let extractedContent: ExtractedContent;

        sendUpdate({
          type: "progress",
          step: `Extracting content from ${extension.toUpperCase()} file...`,
          progress: 30,
          label: "Extracting"
        });
        
        if (extension === "pdf") {
          extractedContent = await extractContentFromPDF(buffer);
        } else if (extension === "docx") {
          extractedContent = await extractContentFromDOCX(buffer);
        } else {
          sendUpdate({ error: "Unsupported file type" });
          controller.close();
          return;
        }

        if (!extractedContent.text || extractedContent.text.trim().length === 0) {
          sendUpdate({ error: "No text content found in file" });
          controller.close();
          return;
        }

        sendUpdate({
          type: "progress",
          step: `Extracted ${extractedContent.text.length} characters`,
          progress: 50,
          label: "Processing"
        });

        sendUpdate({
          type: "progress",
          step: "Converting to Tiptap format with AI...",
          progress: 60,
          label: "Converting"
        });

        const tiptapContent = await convertToTiptapWithAI(extractedContent, enabledExtensions, fileName);

        const finalValidation = TiptapContentSchema.safeParse(tiptapContent);
        if (!finalValidation.success) {
          sendUpdate({ 
            error: "Generated content validation failed",
            details: finalValidation.error.errors 
          });
          controller.close();
          return;
        }

        sendUpdate({
          type: "progress",
          step: "Finalizing conversion...",
          progress: 90,
          label: "Finalizing"
        });

        sendUpdate({
          type: "complete",
          content: tiptapContent,
          metadata: {
            fileName,
            extension,
            originalLength: extractedContent.text.length,
            nodesCount: tiptapContent.content.length,
            imagesFound: extractedContent.images?.length || 0,
            tablesFound: extractedContent.tables?.length || 0,
          },
          step: "Conversion complete!",
          progress: 100,
          label: "Complete"
        });

        controller.close();

      } catch (error) {
        console.error("[FILE CONVERT] Error:", error);
        sendUpdate({ 
          error: error instanceof Error ? error.message : "Failed to process file" 
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

