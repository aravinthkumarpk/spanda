import { getBackend } from "@/lib/backend-instance";
import { AgentPromptError } from "@/lib/agent-prompt-runner";
import { staleBeatAgeDays } from "@/lib/stale-beat-grooming";
import {
  resolveStaleBeatGroomingAgent,
} from "@/lib/stale-beat-grooming-agent";
import {
  buildStaleBeatGroomingPrompt,
  parseStaleBeatGroomingOutput,
  runStaleBeatGroomingPrompt,
} from "@/lib/stale-beat-grooming-prompt";
import {
  applyStaleBeatGroomingOutcome,
} from "@/lib/stale-beat-grooming-outcomes";
import {
  recordStaleBeatGroomingCompleted,
  recordStaleBeatGroomingFailed,
  recordStaleBeatGroomingRunning,
} from "@/lib/stale-beat-grooming-store";
import {
  recordStaleBeatGroomingAgentDetails,
  recordStaleBeatGroomingProgress,
} from "@/lib/stale-beat-grooming-worker-state";
import type {
  StaleBeatGroomingJob,
} from "@/lib/stale-beat-grooming-queue";
import type {
  StaleBeatGroomingFailureLog,
  StaleBeatGroomingResult,
} from "@/lib/stale-beat-grooming-types";
import type { AgentTarget } from "@/lib/types-agent-target";
import type { Beat } from "@/lib/types";

export interface StaleBeatGroomingJobOutcome {
  ok: boolean;
  result?: StaleBeatGroomingResult;
  error?: string;
}

export async function processStaleBeatGroomingJob(
  job: StaleBeatGroomingJob,
): Promise<StaleBeatGroomingJobOutcome> {
  const target = {
    beatId: job.beatId,
    ...(job.repoPath ? { repoPath: job.repoPath } : {}),
  };
  let failureRecorded = false;
  let details:
    | { agentName?: string; agentModel?: string; agentVersion?: string }
    | undefined;
  recordStaleBeatGroomingRunning(target);
  try {
    const beat = await loadBeat(job);
    const agent = await resolveStaleBeatGroomingAgent({
      agentId: job.agentId,
    });
    details = agentDetails(agent);
    recordStaleBeatGroomingRunning(target, details);
    recordStaleBeatGroomingAgentDetails(job.id, details);
    const prompt = buildStaleBeatGroomingPrompt({
      beat,
      ageDays: staleBeatAgeDays(beat, Date.now()) ?? 0,
    });
    let promptLog: StaleBeatGroomingFailureLog | undefined;
    const raw = await runStaleBeatGroomingPrompt(
      prompt,
      job.repoPath,
      agent,
      (timestamp) => recordStaleBeatGroomingProgress(job.id, timestamp),
      (log) => {
        promptLog = log;
      },
    );
    const result = parseStaleBeatGroomingOutput(raw);
    if (!result) {
      recordStaleBeatGroomingFailed(
        target,
        "agent returned unparseable grooming output",
        promptLog,
        details,
      );
      failureRecorded = true;
      throw new Error("agent returned unparseable grooming output");
    }
    await applyStaleBeatGroomingOutcome({ job, result });
    recordStaleBeatGroomingCompleted(target, result, details);
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : String(error);
    if (!failureRecorded) {
      recordStaleBeatGroomingFailed(
        target,
        message,
        error instanceof AgentPromptError ? error.log : undefined,
        details,
      );
    }
    return { ok: false, error: message };
  }
}

function agentDetails(
  agent: AgentTarget,
): { agentName?: string; agentModel?: string; agentVersion?: string } {
  const name = agent.label ?? agent.agent_name ?? agent.agentId;
  return {
    ...(name ? { agentName: name } : {}),
    ...(agent.model ? { agentModel: agent.model } : {}),
    ...(agent.version ? { agentVersion: agent.version } : {}),
  };
}

async function loadBeat(
  job: StaleBeatGroomingJob,
): Promise<Beat> {
  const result = await getBackend().get(
    job.beatId,
    job.repoPath,
  );
  if (!result.ok || !result.data) {
    const detail = result.error instanceof Error
      ? result.error.message
      : result.error ?? "unknown";
    throw new Error(`failed to load beat: ${detail}`);
  }
  return result.data;
}
