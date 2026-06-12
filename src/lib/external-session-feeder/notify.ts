/**
 * Notify decision: a DM fires exactly once per status TRANSITION.
 * stall = a run became blocked (it needs the human); land = it finished.
 * Pure diff over the prev/next run stores — the actual DM sender is the
 * runner's concern (injected there), never this module's.
 *
 * Brand-new sessions: an already-done session is history backfill (silent);
 * an already-blocked one genuinely needs the human (notify).
 */
import type { RunRecord } from "./types";

export interface RunNotification {
  kind: "stall" | "land";
  sessionId: string;
  title: string | undefined;
}

export function diffNotifications(
  prev: ReadonlyMap<string, RunRecord>,
  next: ReadonlyMap<string, RunRecord>,
): RunNotification[] {
  const out: RunNotification[] = [];
  for (const [sessionId, record] of next) {
    const before = prev.get(sessionId)?.status;
    if (before === record.status) continue;
    if (record.status === "blocked") {
      out.push({ kind: "stall", sessionId, title: record.title });
    } else if (record.status === "done" && before !== undefined) {
      out.push({ kind: "land", sessionId, title: record.title });
    }
  }
  return out;
}
