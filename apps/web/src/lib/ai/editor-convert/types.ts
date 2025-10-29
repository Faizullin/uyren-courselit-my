import { UIMessage, LanguageModelUsage } from "ai";
import { z } from "zod";

const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type GeneratorCustomData<T> = {
  usage?: LanguageModelUsage;
  data: T;
};

export type EditorConvertDataParts = {
  progress: GeneratorCustomData<{
    step: string;
    progress: number;
    label: string;
  }>;
  error: GeneratorCustomData<{
    error: string;
    details?: any;
  }>;
  complete: GeneratorCustomData<{
    content: any;
    metadata: {
      fileName: string;
      extension: string;
      originalLength: number;
      nodesCount: number;
      imagesFound: number;
      tablesFound: number;
    };
    step: string;
    progress: number;
    label: string;
  }>;
};

export type EditorConvertChatMessage = UIMessage<MessageMetadata, EditorConvertDataParts>;

