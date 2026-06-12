/**
 * Runs strip on /today: what needs the human now. Blocked runs first
 * (they're why the strip exists), then running, newest first; done runs
 * only from the last few hours as a landing record.
 */
import { describe, expect, it } from "vitest";

import { selectRunsStrip } from "@/lib/external-session-feeder/runs-strip";
import type { RunRecord } from "@/lib/external-session-feeder/types";

const NOW = 10_000_000;
const HOUR = 3_600_000;

function run(partial: Partial<RunRecord> & { sessionId: string }): RunRecord {
  return {
    sourceHash: "h",
    status: "running",
    lastEventAtMs: NOW,
    ...partial,
  };
}

describe("selectRunsStrip", () => {
  it("orders blocked before running, newest first within each", () => {
    const rows = selectRunsStrip(
      [
        run({ sessionId: "r-old", status: "running", lastEventAtMs: NOW - 2 }),
        run({ sessionId: "b1", status: "blocked", lastEventAtMs: NOW - 5 }),
        run({ sessionId: "r-new", status: "running", lastEventAtMs: NOW - 1 }),
      ],
      NOW,
    );
    expect(rows.map((r) => r.sessionId)).toEqual(["b1", "r-new", "r-old"]);
  });

  it("keeps recent landings but drops old done runs", () => {
    const rows = selectRunsStrip(
      [
        run({ sessionId: "fresh-done", status: "done",
          lastEventAtMs: NOW - HOUR }),
        run({ sessionId: "stale-done", status: "done",
          lastEventAtMs: NOW - 30 * HOUR }),
      ],
      NOW,
    );
    expect(rows.map((r) => r.sessionId)).toEqual(["fresh-done"]);
  });
});
