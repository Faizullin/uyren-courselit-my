import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { AssignmentModel, AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { AgentRunModel } from "@workspace/common-logic/models/ai/agent-run.model";
import { AgentRunStatusEnum } from "@workspace/common-logic/models/ai/agent-run.types";
import { extractSubmissionContent } from "./helpers";

export const maxDuration = 300;

interface GradingResult {
  submissionId: string;
  grade: number;
  feedback: string;
  rubricScores?: { criterion: string; score: number; feedback: string }[];
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        const { assignmentId } = await req.json();

        if (!assignmentId) {
          sendUpdate({ error: "Assignment ID is required" });
          controller.close();
          return;
        }

        await connectToDatabase();

        sendUpdate({
          type: "progress",
          step: "Loading assignment and submissions...",
          progress: 5,
          label: "Initializing"
        });

        const assignment = await AssignmentModel.findById(assignmentId).lean();
        if (!assignment) {
          sendUpdate({ error: "Assignment not found" });
          controller.close();
          return;
        }

        const submissions = await AssignmentSubmissionModel.find({
          assignmentId,
          status: AssignmentSubmissionStatusEnum.SUBMITTED
        }).lean();

        if (submissions.length === 0) {
          sendUpdate({ 
            type: "complete",
            step: "No pending submissions to grade",
            progress: 100,
            label: "Complete",
            results: []
          });
          controller.close();
          return;
        }

        const agentRun = await AgentRunModel.create({
          orgId: assignment.orgId,
          agentType: "autograder",
          entityType: "assignment",
          entityId: assignmentId,
          status: AgentRunStatusEnum.RUNNING,
          metadata: {
            assignmentTitle: assignment.title,
            submissionsCount: submissions.length,
          },
        });

        sendUpdate({
          type: "progress",
          step: `Found ${submissions.length} submissions to grade`,
          progress: 10,
          label: "Processing",
          agentRunId: agentRun._id.toString()
        });

        const results: GradingResult[] = [];
        let totalTokens = { input: 0, output: 0 };
        let succeeded = 0;
        let failed = 0;
        const startTime = Date.now();

        for (let i = 0; i < submissions.length; i++) {
          const submission = submissions[i]!;
          const progressPercent = 10 + ((i / submissions.length) * 80);

          sendUpdate({
            type: "progress",
            step: `Grading submission ${i + 1} of ${submissions.length}...`,
            progress: progressPercent,
            label: "Grading",
            currentSubmission: i + 1,
            totalSubmissions: submissions.length
          });

          try {
            console.log(`[AUTOGRADER] Extracting content from submission ${submission._id}`);
            
            const extracted = await extractSubmissionContent(submission);
            
            console.log(`[AUTOGRADER] Extracted:`, {
              textLength: extracted.text.length,
              filesCount: extracted.files.length,
              hasAttachments: extracted.hasAttachments
            });

            const rubricPrompt = assignment.rubrics && assignment.rubrics.length > 0
              ? `Grading Rubric:\n${assignment.rubrics.map((r: any) => `- ${r.criterion}: ${r.points} points\n  ${r.description || ''}`).join('\n')}`
              : `Total Points: ${assignment.totalPoints}`;

            const filesContent = extracted.files.length > 0
              ? `\n\nAttached Files (${extracted.files.length}):\n` + extracted.files.map((f, idx) => 
                  `\nFile ${idx + 1}: ${f.name} (${f.type})\nContent:\n${f.content.substring(0, 1500)}${f.content.length > 1500 ? '\n... (truncated)' : ''}`
                ).join('\n---\n')
              : '';

            const prompt = `You are an expert grader. Grade the following submission for an assignment.

Assignment: ${assignment.title}
Description: ${assignment.description || 'N/A'}

${rubricPrompt}

Submission Text:
${extracted.text.substring(0, 1000)}${extracted.text.length > 1000 ? '\n... (truncated)' : ''}
${filesContent}

IMPORTANT: Provide a DETAILED grading response with:

1. Grade: [number out of ${assignment.totalPoints}]

2. Detailed Feedback (be specific and constructive):
   - What was done well
   - Areas for improvement
   - Specific suggestions
   ${extracted.files.length > 0 ? '- Comments on submitted files/code' : ''}

${assignment.rubrics && assignment.rubrics.length > 0 ? '3. Rubric Breakdown:\n   - Score and specific feedback for each criterion' : ''}

Be thorough, fair, and provide actionable feedback. Reference specific parts of the submission.`;

            const result = streamText({
              model: openai("gpt-4o-mini"),
              prompt,
              temperature: 0.3,
              maxOutputTokens: 500,
            });

            let feedbackText = "";
            for await (const chunk of result.textStream) {
              feedbackText += chunk;
            }

            const finalResult = await result;
            const usagePromise = await finalResult.usage;
            const usage = await usagePromise;
            if (usage) {
              totalTokens.input += (usage as any).promptTokens || 0;
              totalTokens.output += (usage as any).completionTokens || 0;
            }

            const gradeMatch = feedbackText.match(/grade:?\s*(\d+\.?\d*)/i);
            const grade = gradeMatch && gradeMatch[1] ? parseFloat(gradeMatch[1]) : 0;

            await AssignmentSubmissionModel.findByIdAndUpdate(submission._id, {
              status: AssignmentSubmissionStatusEnum.GRADED,
              grade: Math.min(grade, assignment.totalPoints),
              feedback: feedbackText,
              gradedAt: new Date(),
            });

            results.push({
              submissionId: submission._id.toString(),
              grade: Math.min(grade, assignment.totalPoints),
              feedback: feedbackText.substring(0, 200),
            });

            succeeded++;

            sendUpdate({
              type: "submission_graded",
              submissionId: submission._id.toString(),
              grade: Math.min(grade, assignment.totalPoints),
              filesProcessed: extracted.files.length,
              currentSubmission: i + 1,
              totalSubmissions: submissions.length
            });

          } catch (error) {
            console.error(`Error grading submission ${submission._id}:`, error);
            failed++;
            
            sendUpdate({
              type: "submission_error",
              submissionId: submission._id.toString(),
              error: error instanceof Error ? error.message : "Grading failed"
            });
          }
        }

        const duration = Date.now() - startTime;
        const finalTokens = {
          input: totalTokens.input,
          output: totalTokens.output,
          total: totalTokens.input + totalTokens.output,
        };

        await AgentRunModel.findByIdAndUpdate(agentRun._id, {
          status: failed === submissions.length ? AgentRunStatusEnum.FAILED : AgentRunStatusEnum.COMPLETED,
          tokens: finalTokens,
          metrics: {
            duration,
            itemsProcessed: submissions.length,
            itemsSucceeded: succeeded,
            itemsFailed: failed,
          },
          outcome: results,
          completedAt: new Date(),
        });

        sendUpdate({
          type: "complete",
          step: `Graded ${succeeded} submissions successfully${failed > 0 ? `, ${failed} failed` : ''}`,
          progress: 100,
          label: "Complete",
          agentRunId: agentRun._id.toString(),
          results,
          metrics: {
            duration,
            succeeded,
            failed,
            tokens: finalTokens
          }
        });

        controller.close();

      } catch (error) {
        console.error("[AUTOGRADER] Error:", error);
        sendUpdate({ 
          error: error instanceof Error ? error.message : "Failed to process grading" 
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

