import { z } from "zod";

export const TiptapNodeSchema: any = z.lazy(() => z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
  content: z.array(TiptapNodeSchema).optional(),
  marks: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.any()).optional(),
  })).optional(),
  text: z.string().optional(),
}));

export const TiptapContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(TiptapNodeSchema),
});

export function textToTiptapDoc(text: string): any {
  return {
    type: "doc",
    content: text.split('\n\n').map(para => ({
      type: "paragraph",
      content: [{ type: "text", text: para.trim() }]
    })).filter(p => p.content[0]?.text)
  };
}

