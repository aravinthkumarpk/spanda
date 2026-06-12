/**
 * Runs strip on /today: blocked first (they need the human — the strip's
 * whole point), then running, newest first; done runs only from the last
 * 24h as a landing record.
 */
import type { RunRecord } from "./types";

const DONE_WINDOW_MS = 24 * 3_600_000;
const STATUS_RANK = { blocked: 0, running: 1, done: 2 } as const;

export function selectRunsStrip(
  records: readonly RunRecord[],
  nowMs: number,
): RunRecord[] {
  return records
    .filter(
      (r) =>
        r.status !== "done"
        || nowMs - r.lastEventAtMs <= DONE_WINDOW_MS,
    )
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status]
        || b.lastEventAtMs - a.lastEventAtMs,
    );
}
