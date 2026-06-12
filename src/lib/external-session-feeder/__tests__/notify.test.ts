/**
 * Notify decision: a DM fires exactly once per status TRANSITION
 * (running→blocked = stall, anything→done = land). Re-scans of an
 * unchanged store stay silent — the feeder runs every few minutes and
 * must never spam.
 */
import { describe, expect, it } from "vitest";

import { diffNotifications } from "@/lib/external-session-feeder/notify";
import type { RunRecord } from "@/lib/external-session-feeder/types";

function run(partial: Partial<RunRecord> & { sessionId: string }): RunRecord {
  return {
    sourceHash: "h1",
    status: "running",
    lastEventAtMs: 0,
    ...partial,
  };
}

function store(...records: RunRecord[]): Map<string, RunRecord> {
  return new Map(records.map((r) => [r.sessionId, r]));
}

describe("diffNotifications", () => {
  it("emits a stall once when a run transitions running→blocked", () => {
    const prev = store(run({ sessionId: "s1", status: "running" }));
    const next = store(
      run({ sessionId: "s1", status: "blocked", title: "fix tz" }),
    );
    expect(diffNotifications(prev, next)).toEqual([
      { kind: "stall", sessionId: "s1", title: "fix tz" },
    ]);
    // re-scan with no change: silent
    expect(diffNotifications(next, next)).toEqual([]);
  });

  it("emits a land once when a run finishes", () => {
    const prev = store(run({ sessionId: "s1", status: "running" }));
    const next = store(run({ sessionId: "s1", status: "done" }));
    expect(diffNotifications(prev, next)).toEqual([
      { kind: "land", sessionId: "s1", title: undefined },
    ]);
  });

  it("stays silent for brand-new sessions already done (history backfill)", () => {
    const next = store(run({ sessionId: "old", status: "done" }));
    expect(diffNotifications(new Map(), next)).toEqual([]);
  });

  it("notifies for a brand-new session that is already blocked", () => {
    const next = store(run({ sessionId: "s2", status: "blocked" }));
    expect(diffNotifications(new Map(), next)).toEqual([
      { kind: "stall", sessionId: "s2", title: undefined },
    ]);
  });
});
