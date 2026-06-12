import { createHash } from "node:crypto";
import type { ParsedSession, StopReason } from "./types";

interface RawLine {
  type?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  sessionId?: string;
  aiTitle?: string;
  customTitle?: string;
  message?: { stop_reason?: StopReason | null };
}

function toMs(ts?: string): number {
  if (!ts) return 0;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Parse one Claude Code session transcript (newline-delimited JSON) into the
 * distilled ParsedSession the feeder needs.
 *
 * Malformed lines are skipped, not fatal: transcripts are appended to while the
 * session is live, so the final line is often a partial write. (5wo.2 eng review
 * failure mode #2.) Returns null when the transcript has no sessionId at all.
 */
export function parseClaudeSession(jsonl: string): ParsedSession | null {
  const sourceHash = createHash("sha1").update(jsonl).digest("hex");
  let sessionId: string | undefined;
  let cwd: string | undefined;
  let gitBranch: string | undefined;
  let title: string | undefined;
  let startedAtMs = Number.POSITIVE_INFINITY;
  let lastEventAtMs = 0;
  let lastStopReason: StopReason | undefined;
  let toolInFlight = false;
  let eventCount = 0;

  for (const rawLine of jsonl.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    let parsed: RawLine;
    try {
      parsed = JSON.parse(line) as RawLine;
    } catch {
      continue; // tolerate partial trailing line / corruption
    }

    eventCount += 1;
    if (parsed.sessionId) sessionId = parsed.sessionId;
    if (parsed.cwd) cwd = parsed.cwd;
    if (parsed.gitBranch) gitBranch = parsed.gitBranch;
    if (parsed.aiTitle) title = parsed.aiTitle;
    if (parsed.customTitle) title = parsed.customTitle; // explicit title wins

    const ms = toMs(parsed.timestamp);
    if (ms > 0) {
      if (ms < startedAtMs) startedAtMs = ms;
      if (ms > lastEventAtMs) lastEventAtMs = ms;
    }

    if (parsed.type === "assistant" && parsed.message?.stop_reason) {
      // stop_reason is null mid-stream; only act on a concrete value.
      lastStopReason = parsed.message.stop_reason;
      toolInFlight = parsed.message.stop_reason === "tool_use";
    } else if (parsed.type === "user" && toolInFlight) {
      // A user turn after a tool_use carries the tool_result: tool has landed.
      toolInFlight = false;
    }
  }

  if (!sessionId) return null;
  if (!Number.isFinite(startedAtMs)) startedAtMs = lastEventAtMs;

  return {
    sessionId,
    cwd,
    gitBranch,
    title,
    startedAtMs,
    lastEventAtMs,
    lastStopReason,
    toolInFlight,
    eventCount,
    sourceHash,
  };
}
