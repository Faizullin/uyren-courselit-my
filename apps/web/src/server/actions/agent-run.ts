"use server";

import { connectToDatabase } from "@workspace/common-logic/lib/db";
import { AgentRunModel } from "@workspace/common-logic/models/ai/agent-run.model";
import { AgentRunStatusEnum } from "@workspace/common-logic/models/ai/agent-run.types";
import { AssignmentSubmissionModel } from "@workspace/common-logic/models/lms/assignment.model";
import { AssignmentSubmissionStatusEnum } from "@workspace/common-logic/models/lms/assignment.types";
import { getActionContext } from "../api/core/actions";
import { NotFoundException } from "../api/core/exceptions";

export async function revertAgentRun(agentRunId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getActionContext();
    await connectToDatabase();

    const agentRun = await AgentRunModel.findById(agentRunId);
    
    if (!agentRun) {
      throw new NotFoundException("Agent run", agentRunId);
    }

    if (agentRun.agentType !== "autograder") {
      return { success: false, error: "Only autograder runs can be reverted" };
    }

    if (!agentRun.outcome || !Array.isArray(agentRun.outcome)) {
      return { success: false, error: "No outcome data to revert" };
    }

    console.log(`[REVERT] Reverting ${agentRun.outcome.length} graded submissions`);

    for (const result of agentRun.outcome) {
      await AssignmentSubmissionModel.findByIdAndUpdate(result.submissionId, {
        status: AssignmentSubmissionStatusEnum.SUBMITTED,
        grade: null,
        feedback: null,
        gradedAt: null,
      });
    }

    await AgentRunModel.findByIdAndUpdate(agentRunId, {
      status: AgentRunStatusEnum.REVERTED,
    });

    console.log(`[REVERT] Successfully reverted agent run ${agentRunId}`);

    return { success: true };
  } catch (error) {
    console.error("[REVERT] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to revert grading" 
    };
  }
}

