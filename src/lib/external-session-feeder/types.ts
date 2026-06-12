/**
 * External-session feeder: shared types.
 *
 * The feeder ingests Claude Code session transcripts (~/.claude/projects/**.jsonl)
 * that Foolery did NOT launch, so the board can show every agent run, not only
 * the ones dispatched through its own terminal. This file holds the pure data
 * shapes. classify.ts and ingest.ts hold the risk-bearing logic that the 5wo.2
 * eng review flagged as CRITICAL: the stall false-positive guard and idempotent
 * ingest.
 */

export type RunStatus = "running" | "blocked" | "done";

/** Claude transcripts carry `stop_reason` on each assistant turn. */
export type StopReason =
  | "tool_use"
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | string;

export interface FeederClock {
  /** Injected wall-clock in ms, so classification is deterministic in tests. */
  now: number;
}

export interface FeederThresholds {
  /** Silence past this, with the assistant awaiting the human, means "blocked". */
  staleMs: number;
  /** Silence past this means the run is over: "done". */
  doneMs: number;
}

/** The distilled shape of one Claude Code session, derived from its jsonl. */
export interface ParsedSession {
  sessionId: string;
  cwd?: string;
  gitBranch?: string;
  title?: string;
  startedAtMs: number;
  lastEventAtMs: number;
  /** stop_reason of the last assistant turn, if any. */
  lastStopReason?: StopReason;
  /**
   * True when the last assistant turn ended on a tool_use and no tool_result
   * has arrived yet: a tool is in flight. The eng review's CRITICAL guard says
   * this is "running", never "blocked", however long the tool takes.
   */
  toolInFlight: boolean;
  eventCount: number;
  /** Stable hash of the source bytes; drives idempotent ingest. */
  sourceHash: string;
}

/** One row in the run feed (what the inbox and ship-log read). */
export interface RunRecord {
  sessionId: string;
  sourceHash: string;
  status: RunStatus;
  repoPath?: string;
  title?: string;
  lastEventAtMs: number;
}
