import { describe, expect, it } from "vitest";

import { classifyRunStatus } from "@/lib/external-session-feeder/classify";
import type {
  FeederThresholds,
  ParsedSession,
} from "@/lib/external-session-feeder/types";

const THRESHOLDS: FeederThresholds = {
  staleMs: 5 * 60_000, // 5 min
  doneMs: 30 * 60_000, // 30 min
};

const NOW = 1_700_000_000_000;

function session(overrides: Partial<ParsedSession>): ParsedSession {
  return {
    sessionId: "s1",
    startedAtMs: NOW - 60_000,
    lastEventAtMs: NOW,
    toolInFlight: false,
    eventCount: 1,
    sourceHash: "h",
    ...overrides,
  };
}

describe("classifyRunStatus", () => {
  // ── The CRITICAL guard from the 5wo.2 eng review ──────────────
  it("CRITICAL: a tool in flight stays running even after long silence", () => {
    // A 20-minute Bash build is silent but the tool is still running.
    // It must NOT be flagged blocked, or the doorbell cries wolf.
    const s = session({
      toolInFlight: true,
      lastStopReason: "tool_use",
      lastEventAtMs: NOW - 20 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("running");
  });

  it("CRITICAL: tool_use without toolInFlight uses silence, never auto-blocks", () => {
    // Last assistant turn was tool_use, the tool_result already landed
    // (toolInFlight false). Not end_turn, so it is running, not blocked.
    const s = session({
      toolInFlight: false,
      lastStopReason: "tool_use",
      lastEventAtMs: NOW - 10 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("running");
  });

  it("blocks when the assistant ended its turn and went quiet past staleMs", () => {
    const s = session({
      toolInFlight: false,
      lastStopReason: "end_turn",
      lastEventAtMs: NOW - 6 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("blocked");
  });

  it("stays running when end_turn but not yet past staleMs", () => {
    const s = session({
      toolInFlight: false,
      lastStopReason: "end_turn",
      lastEventAtMs: NOW - 2 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("running");
  });

  it("is running on fresh activity", () => {
    const s = session({ lastEventAtMs: NOW - 10_000 });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("running");
  });

  it("is done after doneMs of silence", () => {
    const s = session({
      lastStopReason: "end_turn",
      lastEventAtMs: NOW - 31 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("done");
  });

  it("doneMs wins even over a stuck tool in flight (no eternal running)", () => {
    const s = session({
      toolInFlight: true,
      lastStopReason: "tool_use",
      lastEventAtMs: NOW - 45 * 60_000,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("done");
  });

  it("treats the staleMs boundary as blocked (>=, not >)", () => {
    const s = session({
      toolInFlight: false,
      lastStopReason: "end_turn",
      lastEventAtMs: NOW - THRESHOLDS.staleMs,
    });
    expect(classifyRunStatus(s, THRESHOLDS, { now: NOW })).toBe("blocked");
  });
});
