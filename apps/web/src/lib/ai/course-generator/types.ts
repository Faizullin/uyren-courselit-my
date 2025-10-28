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

type CourseGeneratorDataParts = {
  progress: GeneratorCustomData<{
    step: string;
    progress: number;
    label: string;
    currentStep: number;
    currentLesson?: number;
    totalLessons?: number;
  }>;
  error: GeneratorCustomData<{
    error: string;
    details?: any;
  }>;
  "structure-progress": GeneratorCustomData<{
    structure: any;
    chaptersCount: number;
    lessonsCount: number;
    progress: number;
  }>;
  "structure-complete": GeneratorCustomData<{
    structure: any;
    step: string;
    progress: number;
    label: string;
    currentStep: number;
  }>;
  "course-created": GeneratorCustomData<{
    courseId: string;
    structure: any;
    step: string;
    progress: number;
    label: string;
    currentStep: number;
  }>;
  "lesson-created": GeneratorCustomData<{
    lessonId: string;
    lessonTitle: string;
    chapterTitle: string;
    currentLesson: number;
    totalLessons: number;
  }>;
  "lesson-error": GeneratorCustomData<{
    lessonTitle: string;
    error: string;
  }>;
  usage: GeneratorCustomData<any>;
  complete: GeneratorCustomData<{
    step: string;
    progress: number;
    label: string;
    currentStep: number;
    courseId: string;
    results: Array<{
      lessonId: string;
      title: string;
      chapterTitle: string;
    }>;
    metrics: {
      duration: number;
      succeeded: number;
      failed: number;
    };
  }>;
};

export type CourseGeneratorChatMessage = UIMessage<MessageMetadata, CourseGeneratorDataParts>;

