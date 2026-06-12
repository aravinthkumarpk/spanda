import { describe, expect, it } from "vitest";

import { ingestSessions } from "@/lib/external-session-feeder/ingest";
import type { RunRecord } from "@/lib/external-session-feeder/types";

function rec(overrides: Partial<RunRecord>): RunRecord {
  return {
    sessionId: "s1",
    sourceHash: "h1",
    status: "running",
    lastEventAtMs: 1,
    ...overrides,
  };
}

describe("ingestSessions (idempotency)", () => {
  it("CRITICAL: re-ingesting the same session is a no-op", () => {
    const existing = new Map<string, RunRecord>([["s1", rec({})]]);
    const { store, changed } = ingestSessions(existing, [rec({})]);
    expect(changed).toEqual([]); // nothing changed
    expect(store.size).toBe(1); // no duplicate row
  });

  it("CRITICAL: running the feeder twice yields no second write", () => {
    const first = ingestSessions(new Map(), [rec({})]);
    expect(first.changed).toHaveLength(1); // new session: written once
    const second = ingestSessions(first.store, [rec({})]);
    expect(second.changed).toEqual([]); // second fire: idempotent
  });

  it("updates a session when its sourceHash changes (new events)", () => {
    const existing = new Map<string, RunRecord>([["s1", rec({})]]);
    const updated = rec({ sourceHash: "h2", status: "done" });
    const { store, changed } = ingestSessions(existing, [updated]);
    expect(changed).toEqual([updated]);
    expect(store.get("s1")?.status).toBe("done");
    expect(store.size).toBe(1); // updated in place, not duplicated
  });

  it("adds a genuinely new session", () => {
    const { store, changed } = ingestSessions(new Map(), [
      rec({ sessionId: "s2" }),
    ]);
    expect(changed).toHaveLength(1);
    expect(store.has("s2")).toBe(true);
  });

  it("does not mutate the input map", () => {
    const existing = new Map<string, RunRecord>([["s1", rec({})]]);
    ingestSessions(existing, [rec({ sessionId: "s2" })]);
    expect(existing.size).toBe(1); // caller's map untouched
  });
});
