import { getActionContext } from "@/server/api/core/actions";
import { CourseGeneratorChatMessage } from "@/lib/ai/course-generator/types";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { CourseModel } from "@workspace/common-logic/models/lms/course.model";
import { CourseLevelEnum, CourseStatusEnum } from "@workspace/common-logic/models/lms/course.types";
import { LessonModel } from "@workspace/common-logic/models/lms/lesson.model";
import { LessonTypeEnum } from "@workspace/common-logic/models/lms/lesson.types";
import { slugify } from "@workspace/utils";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, LanguageModelUsage, streamObject, streamText, UIMessageStreamWriter } from "ai";
import type { ModelMessage } from "ai";
import mongoose from "mongoose";
import { z } from "zod";

export const maxDuration = 300;

type DataStream = UIMessageStreamWriter<CourseGeneratorChatMessage>;

const LessonSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  learningObjectives: z.array(z.string()).optional(),
  estimatedMinutes: z.number().optional(),
});

const ChapterSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  lessons: z.array(LessonSchema),
});

const CourseStructureSchema = z.object({
  title: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  level: z.nativeEnum(CourseLevelEnum),
  durationInWeeks: z.number(),
  chapters: z.array(ChapterSchema),
  prerequisites: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  keyTakeaways: z.array(z.string()).optional(),
});

const GenerateStructureRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  useWebSearch: z.boolean().optional().default(true),
  includeObjectives: z.boolean().optional().default(true),
  additionalPrompt: z.string().optional(),
});

const ApproveStructureRequestSchema = z.object({
  structure: CourseStructureSchema,
});

const GenerateContentRequestSchema = z.object({
  courseId: z.string(),
  structure: CourseStructureSchema,
  useWebSearch: z.boolean().optional().default(true),
  includeQuizzes: z.boolean().optional().default(false),
  additionalPrompt: z.string().optional(),
});

type GenerateStructureRequest = z.infer<typeof GenerateStructureRequestSchema>;
type ApproveStructureRequest = z.infer<typeof ApproveStructureRequestSchema>;
type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

export async function POST(req: Request) {
  const body = await req.json();
  const { step, ...data } = body;

  let finalMergedUsage: LanguageModelUsage | undefined;

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      handleRequest(step, data, dataStream, finalMergedUsage);
    },
    onError: () => "An error occurred during course generation",
  });

  return createUIMessageStreamResponse({ stream });
}

async function handleRequest(
  step: string,
  data: any,
  dataStream: DataStream,
  finalMergedUsage: LanguageModelUsage | undefined
) {
  try {
    const ctx = await getActionContext();
    await connectToDatabase();

    if (step === "generate_structure") {
      const validatedData = GenerateStructureRequestSchema.parse(data);
      await handleGenerateStructure(validatedData, dataStream, ctx, finalMergedUsage);
    } else if (step === "approve_structure") {
      const validatedData = ApproveStructureRequestSchema.parse(data);
      await handleApproveStructure(validatedData, dataStream, ctx, finalMergedUsage);
    } else if (step === "generate_content") {
      const validatedData = GenerateContentRequestSchema.parse(data);
      await handleGenerateContent(validatedData, dataStream, ctx, finalMergedUsage);
    } else {
      dataStream.write({
        type: "data-error",
        data: { data: { error: "Invalid step" } }
      });
    }
  } catch (error) {
    console.error("[COURSE GENERATOR] Error:", error);
    dataStream.write({
      type: "data-error",
      data: {
        data: { error: error instanceof Error ? error.message : "Failed to process request" }
      }
    });
  }
}

async function handleGenerateStructure(
  data: GenerateStructureRequest,
  dataStream: DataStream,
  ctx: Awaited<ReturnType<typeof getActionContext>>,
  finalMergedUsage: LanguageModelUsage | undefined
) {
  const systemMessage = `You are an expert course curriculum designer with deep knowledge of pedagogy and current industry trends.

Your task is to create comprehensive, well-structured course outlines that are:
- Logical and progressive (each concept builds on previous ones)
- Pedagogically sound with fundamentals first, then increasing complexity
- Balanced between theoretical knowledge and practical application
- Modern and industry-relevant with current examples and tools
- Clear with actionable learning outcomes

${data.useWebSearch ? 'Draw upon your knowledge of current best practices, modern industry standards, recent developments, and real-world applications. Include contemporary examples, tools, and frameworks that are widely used today.' : ''}

Ensure all content reflects ${new Date().getFullYear()} best practices and current industry standards.`;

  const userMessage = `Create a complete course structure for:

**Title:** ${data.title}
**Description:** ${data.description}
${data.additionalPrompt ? `\n**Additional Instructions:** ${data.additionalPrompt}` : ''}

Generate a course structure with:
1. A refined title (concise, clear, professional)
2. A detailed description (2-3 paragraphs: what students learn, why it matters, how it's applied)
3. A short description (1-2 compelling marketing sentences)
4. Appropriate level (BEGINNER, INTERMEDIATE, or ADVANCED)
5. Estimated duration in weeks (realistic: 4-12 weeks)
6. Prerequisites (specific skills, tools, or knowledge needed)
7. Target audience (role, background, goals)
8. Key takeaways (3-5 concrete, measurable outcomes)
9. 3-6 chapters, each with:
   - Clear chapter title and overview
   - 3-8 lessons with:
     * Clear lesson title
     * Brief description
     ${data.includeObjectives ? '* 3-5 measurable learning objectives (using action verbs: understand, apply, create, analyze, evaluate)' : ''}
     * Estimated time (15-60 minutes per lesson)`;

  try {
    const messages: ModelMessage[] = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ];

    if (data.useWebSearch) {
      dataStream.write({
        type: "data-progress",
        data: {
          data: {
            step: "Researching current best practices...",
            progress: 20,
            label: "Researching",
            currentStep: 1,
          }
        }
      });

      try {
        const researchResult = await generateText({
          model: openai("gpt-4o"),
          tools: {
            webSearch: openai.tools.webSearch(),
          },
          system: "You are a research assistant. Find current, relevant information about the given topic.",
          prompt: `Research current information about: ${data.title}. Find latest trends, tools, frameworks, and best practices in this field.`,
          temperature: 0.7,
        });

        messages.push({
          role: "user",
          content: `RECENT RESEARCH FINDINGS:\n${researchResult.text}\n\nUse this research to make the course current and relevant.`,
        });
      } catch (searchError) {
        console.error('[WEB SEARCH] Error during research:', searchError);
      }
    }

    dataStream.write({
      type: "data-progress",
      data: {
        data: {
          step: "Generating course structure...",
          progress: 40,
          label: "Generating",
          currentStep: 1,
        }
      }
    });

    const result = streamObject({
      model: openai("gpt-4o"),
      schema: CourseStructureSchema,
      messages,
      temperature: 0.7,
      onFinish: ({ object, usage }) => {
        finalMergedUsage = usage;
        dataStream.write({
          type: "data-structure-complete",
          data: {
            data: {
              structure: object,
              step: "Course structure generated successfully!",
              progress: 100,
              label: "Complete",
              currentStep: 1,
            },
            usage: finalMergedUsage,
          }
        });
      },
    });

    for await (const partialObject of result.partialObjectStream) {
      if (partialObject && partialObject.chapters) {
        const chaptersCount = partialObject.chapters.length;
        const lessonsCount = partialObject.chapters.reduce((sum, ch) => sum + (ch?.lessons?.length || 0), 0);

        dataStream.write({
          type: "data-structure-progress",
          data: {
            data: {
              structure: partialObject,
              chaptersCount,
              lessonsCount,
              progress: 40 + Math.min((chaptersCount / 6) * 50, 50),
            }
          }
        });
      }
    }

  } catch (error) {
    console.error("[COURSE GENERATOR] Structure generation error:", error);
    throw new Error("Failed to generate course structure");
  }
}

async function handleApproveStructure(
  data: ApproveStructureRequest,
  dataStream: DataStream,
  ctx: Awaited<ReturnType<typeof getActionContext>>,
  finalMergedUsage: LanguageModelUsage | undefined
) {
  const structure = data.structure;
  const courseCode = `COURSE-${Date.now().toString(36).toUpperCase()}`;

  const course = await CourseModel.create({
    orgId: ctx.domainData.domainObj.orgId,
    title: structure.title,
    courseCode,
    slug: slugify(structure.title.toLowerCase()),
    ownerId: ctx.user._id,
    description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: structure.description }] }] },
    shortDescription: structure.shortDescription,
    level: structure.level,
    durationInWeeks: structure.durationInWeeks,
    published: false,
    featured: false,
    upcoming: false,
    allowEnrollment: false,
    allowSelfEnrollment: false,
    paidCourse: false,
    status: CourseStatusEnum.IN_PROGRESS,
    chapters: [],
  });

  for (let i = 0; i < structure.chapters.length; i++) {
    const chapterData = structure.chapters[i];
    if (!chapterData) continue;

    const chapterId = new mongoose.Types.ObjectId();

    course.chapters.push({
      _id: chapterId,
      title: chapterData.title,
      description: chapterData.description,
      order: i,
      lessonOrderIds: [],
    });
  }

  await course.save();

  dataStream.write({
    type: "data-course-created",
    data: {
      data: {
        courseId: course._id.toString(),
        structure: structure,
        step: "Course structure saved successfully!",
        progress: 100,
        label: "Complete",
        currentStep: 2,
      }
    }
  });
}

async function handleGenerateContent(
  data: GenerateContentRequest,
  dataStream: DataStream,
  ctx: Awaited<ReturnType<typeof getActionContext>>,
  finalMergedUsage: LanguageModelUsage | undefined
) {
  const course = await CourseModel.findById(data.courseId);

  if (!course) {
    dataStream.write({ type: "data-error", data: { data: { error: "Course not found" } } });
    return;
  }

  const structureValidation = CourseStructureSchema.safeParse(data.structure);
  if (!structureValidation.success) {
    dataStream.write({
      type: "data-error",
      data: {
        data: {
          error: "Invalid course structure",
          details: structureValidation.error.errors
        }
      }
    });
    return;
  }

  const structureData = structureValidation.data;

  const results: Array<{
    lessonId: string;
    title: string;
    chapterTitle: string;
  }> = [];
  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now();

  let lessonIndex = 0;
  const totalLessons = structureData.chapters.reduce((sum: number, ch) => {
    return sum + (ch.lessons?.length || 0);
  }, 0);

  for (let chapterIdx = 0; chapterIdx < course.chapters.length; chapterIdx++) {
    const chapter = course.chapters[chapterIdx];
    if (!chapter) continue;

    const chapterFromStructure = structureData.chapters[chapterIdx];
    if (!chapterFromStructure?.lessons) continue;

    const courseChapter = chapter;

    for (let lessonIdx = 0; lessonIdx < chapterFromStructure.lessons.length; lessonIdx++) {
      const lessonData = chapterFromStructure.lessons[lessonIdx];
      if (!lessonData) continue;

      lessonIndex++;

      const progressPercent = 5 + ((lessonIndex / totalLessons) * 85);

      dataStream.write({
        type: "data-progress",
        data: {
          data: {
            step: `Generating: ${lessonData.title}`,
            progress: progressPercent,
            label: "Generating Content",
            currentStep: 3,
            currentLesson: lessonIndex,
            totalLessons,
          }
        }
      });

      try {
        const hasObjectives = lessonData.learningObjectives && lessonData.learningObjectives.length > 0;
        const objectivesText = hasObjectives && lessonData.learningObjectives
          ? `\n**Learning Objectives:**\nBy the end of this lesson, students will be able to:\n${lessonData.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`
          : '';

        const lessonSystemMessage = `You are an expert educator and content creator with deep pedagogical knowledge.

Your role is to create comprehensive, engaging lesson content that is:
- Clear and accessible to the target audience
- Well-structured with logical flow
- Rich with practical examples and real-world applications
- Pedagogically sound with proper scaffolding
- Engaging and motivational

${data.useWebSearch ? `Include current, real-world examples from ${new Date().getFullYear()}, recent statistics, modern tools, contemporary best practices, and industry-standard approaches. Reference specific companies, products, or case studies where relevant.` : ''}

Use markdown formatting and maintain a professional but conversational, encouraging tone. Make it feel like a knowledgeable mentor explaining the topic.`;

        const lessonUserMessage = `Create detailed lesson content for:

**Course:** ${course.title}
**Chapter:** ${courseChapter.title}
**Lesson:** ${lessonData.title}
${lessonData.description ? `**Focus:** ${lessonData.description}` : ''}
${objectivesText}
${lessonData.estimatedMinutes ? `**Target Duration:** ${lessonData.estimatedMinutes} minutes` : ''}
${data.additionalPrompt ? `\n**Additional Instructions:** ${data.additionalPrompt}` : ''}

Structure the content with these sections:

## Introduction
- Hook the learner with a compelling opening
- Explain why this lesson matters
- Connect to previous lessons or real-world scenarios

## Main Content
- Break complex ideas into digestible parts
- Use analogies and metaphors for difficult concepts
- Include specific, concrete examples (real companies, products, tools)
- Add step-by-step explanations for processes
- Use visual descriptions or diagrams (described in text)
- Highlight common pitfalls and how to avoid them

## Practical Application
- Show how to apply these concepts
- Include examples or mini-exercises
- Provide tips for real-world implementation

## Summary
- Recap the key points
- Reinforce how objectives were met
- Preview what comes next

${data.includeQuizzes ? `\n## Practice Questions\nCreate 3-5 multiple-choice or short-answer questions that test understanding of key concepts. Include a mix of recall and application questions.` : ''}

**Format with:**
- Markdown (## for sections, ### for subsections)
- **Bold** for key terms (first time introduced)
- *Italics* for emphasis
- \`Code blocks\` for technical terms, commands, or code
- Bullet points (-) for lists
- Numbered lists (1. 2. 3.) for sequential steps
- > Blockquotes for important callouts or tips`;

        let contentText = "";

        try {
          if (data.useWebSearch) {
            const result = await generateText({
              model: openai("gpt-4o-mini"),
              tools: {
                webSearch: openai.tools.webSearch(),
              },
              system: lessonSystemMessage,
              prompt: lessonUserMessage,
              temperature: 0.7,
            });
            contentText = result.text;
          } else {
            const result = streamText({
              model: openai("gpt-4o-mini"),
              system: lessonSystemMessage,
              prompt: lessonUserMessage,
              temperature: 0.7,
              maxOutputTokens: 3000,
            });

            for await (const chunk of result.textStream) {
              contentText += chunk;
            }
          }
        } catch (error) {
          console.error(`[LESSON] Error generating ${lessonData.title}:`, error);
          throw error;
        }

        const lesson = await LessonModel.create({
          orgId: course.orgId,
          title: lessonData.title,
          slug: slugify(lessonData.title.toLowerCase()),
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: contentText }] }] },
          type: LessonTypeEnum.TEXT,
          downloadable: false,
          requiresEnrollment: true,
          published: false,
          owner: ctx.user._id,
        });

        courseChapter.lessonOrderIds.push(lesson._id);
        succeeded++;

        results.push({
          lessonId: lesson._id.toString(),
          title: lessonData.title,
          chapterTitle: courseChapter.title,
        });

        dataStream.write({
          type: "data-lesson-created",
          data: {
            data: {
              lessonId: lesson._id.toString(),
              lessonTitle: lessonData.title,
              chapterTitle: courseChapter.title,
              currentLesson: lessonIndex,
              totalLessons,
            }
          }
        });

      } catch (error) {
        console.error(`Error generating lesson ${lessonData.title}:`, error);
        failed++;

        dataStream.write({
          type: "data-lesson-error",
          data: {
            data: {
              lessonTitle: lessonData.title,
              error: error instanceof Error ? error.message : "Generation failed",
            },
          }
        });
      }
    }
  }

  await course.save();

  const duration = Date.now() - startTime;

  dataStream.write({
    type: "data-complete",
    data: {
      data: {
        step: `Generated ${succeeded} lessons successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        progress: 100,
        label: "Complete",
        currentStep: 3,
        courseId: course._id.toString(),
        results,
        metrics: {
          duration,
          succeeded,
          failed,
        },
      },
    }
  });
}

