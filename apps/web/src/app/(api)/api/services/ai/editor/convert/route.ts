import { EditorConvertChatMessage } from "@/lib/ai/editor-convert/types";
import { buildTipTapFormatInstructions } from "@/lib/ai/prompts/tiptap-format";
import { TiptapContentSchema } from "@/lib/ai/prompts/tiptap-helpers";
import { streamObject, createUIMessageStream, createUIMessageStreamResponse, UIMessageStreamWriter } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export const maxDuration = 60;
export const runtime = "nodejs";

type DataStream = UIMessageStreamWriter<EditorConvertChatMessage>;

const allowedExtensions = ["pdf", "docx"] as const;

const RequestSchema = z.object({
  extensions: z.array(z.string()).optional().default(["paragraph", "heading", "bulletList", "orderedList", "table", "image"]),
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
  dataStream: DataStream
): Promise<any> {
  const extensionInstructions: Record<string, string> = {
    paragraph: "Use 'paragraph' type for regular text blocks",
    heading: "Use 'heading' type with attrs.level (1-6) for headings",
    bulletList: "Use 'bulletList' with 'listItem' children for bullet points",
    orderedList: "Use 'orderedList' with 'listItem' children for numbered lists",
    table: "Use 'table' > 'tableRow' > 'tableCell' structure for tables",
    image: "Use 'image' type with attrs.src for images (mark with placeholder URL)",
    blockquote: "Use 'blockquote' for quoted text",
    codeBlock: "Use 'codeBlock' for code snippets",
    hardBreak: "Use 'hardBreak' for line breaks",
    bold: "Use marks: [{ type: 'bold' }] for bold text",
    italic: "Use marks: [{ type: 'italic' }] for italic text",
  };

  const activeInstructions = enabledExtensions
    .map(ext => extensionInstructions[ext])
    .filter(Boolean)
    .join("\n- ");

  const systemMessage = `You are a document conversion expert specializing in Tiptap JSON format.

Your task is to convert text content into valid Tiptap JSON structure with proper nesting and formatting.`;

  const userMessage = `Convert the following text content into Tiptap JSON format.

**Enabled Extensions:**
- ${activeInstructions}

**Text content:**
${extractedContent.text.substring(0, 8000)}${extractedContent.text.length > 8000 ? '\n... (content truncated)' : ''}

${extractedContent.tables && extractedContent.tables.length > 0 ? `\n**Tables detected:** ${extractedContent.tables.length}` : ''}

**Structure Requirements:**
- Start with type: "doc"
- Add content array with proper nodes
- Nest content correctly (lists have listItems, tables have rows/cells)
- Add text nodes inside content where needed
- Use marks array for formatting (bold, italic, etc.)

Return ONLY valid Tiptap JSON.`;

  try {
    const result = streamObject({
      model: openai("gpt-4o"),
      schema: TiptapContentSchema,
      system: systemMessage,
      prompt: userMessage,
      temperature: 0.2,
    });
    
    let finalObject;
    for await (const partialObject of result.partialObjectStream) {
      if (partialObject) {
        finalObject = partialObject;
      }
    }

    return finalObject;
  } catch (error) {
    console.error("[AI CONVERT] Error:", error);
    throw new Error("Failed to convert text to Tiptap format");
  }
}

export async function POST(req: Request) {
  const stream = createUIMessageStream<EditorConvertChatMessage>({
    execute: async ({ writer: dataStream }) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const extensionsRaw = formData.get("extensions") as string | null;

        if (!file) {
          dataStream.write({
            type: "data-error",
            data: { data: { error: "No file provided" } }
          });
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
            console.error("[FILE CONVERT] Extensions parse error:", error);
          }
        }

        const fileName = file.name;
        const extension = fileName.split(".").pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension as any)) {
          dataStream.write({
            type: "data-error",
            data: { data: { error: `Only ${allowedExtensions.join(", ")} files are supported` } }
          });
          return;
        }

        dataStream.write({
          type: "data-progress",
          data: {
            data: {
              step: `Extracting content from ${extension.toUpperCase()} file...`,
              progress: 30,
              label: "Extracting"
            }
          }
        });

        const buffer = await file.arrayBuffer();
        let extractedContent: ExtractedContent;
        
        if (extension === "pdf") {
          extractedContent = await extractContentFromPDF(buffer);
        } else if (extension === "docx") {
          extractedContent = await extractContentFromDOCX(buffer);
        } else {
          dataStream.write({
            type: "data-error",
            data: { data: { error: "Unsupported file type" } }
          });
          return;
        }

        if (!extractedContent.text || extractedContent.text.trim().length === 0) {
          dataStream.write({
            type: "data-error",
            data: { data: { error: "No text content found in file" } }
          });
          return;
        }

        dataStream.write({
          type: "data-progress",
          data: {
            data: {
              step: "Converting to Tiptap format with AI...",
              progress: 60,
              label: "Converting"
            }
          }
        });

        const tiptapContent = await convertToTiptapWithAI(extractedContent, enabledExtensions, dataStream);

        const finalValidation = TiptapContentSchema.safeParse(tiptapContent);
        if (!finalValidation.success) {
          dataStream.write({
            type: "data-error",
            data: {
              data: {
                error: "Generated content validation failed",
                details: finalValidation.error.errors
              }
            }
          });
          return;
        }

        dataStream.write({
          type: "data-complete",
          data: {
            data: {
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
            }
          }
        });

      } catch (error) {
        console.error("[FILE CONVERT] Error:", error);
        dataStream.write({
          type: "data-error",
          data: {
            data: { error: error instanceof Error ? error.message : "Failed to process file" }
          }
        });
      }
    },
    onError: () => "An error occurred during file conversion",
  });

  return createUIMessageStreamResponse({ stream });
}

