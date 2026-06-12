import { describe, expect, it } from "vitest";

import { parseClaudeSession } from "@/lib/external-session-feeder/parse";

function line(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

const BASE = {
  cwd: "/home/deploy/code/spanda",
  gitBranch: "feat/x",
  sessionId: "abc-123",
};

describe("parseClaudeSession", () => {
  it("extracts identity, cwd, branch, title, and timestamps", () => {
    const jsonl = [
      line({ ...BASE, type: "user", timestamp: "2026-06-12T10:00:00Z" }),
      line({ type: "ai-title", sessionId: "abc-123", aiTitle: "do the thing" }),
      line({
        ...BASE,
        type: "assistant",
        timestamp: "2026-06-12T10:01:00Z",
        message: { stop_reason: "end_turn" },
      }),
    ].join("\n");

    const s = parseClaudeSession(jsonl);
    expect(s).not.toBeNull();
    expect(s?.sessionId).toBe("abc-123");
    expect(s?.cwd).toBe("/home/deploy/code/spanda");
    expect(s?.gitBranch).toBe("feat/x");
    expect(s?.title).toBe("do the thing");
    expect(s?.lastStopReason).toBe("end_turn");
    expect(s?.toolInFlight).toBe(false);
    expect(s?.startedAtMs).toBe(Date.parse("2026-06-12T10:00:00Z"));
    expect(s?.lastEventAtMs).toBe(Date.parse("2026-06-12T10:01:00Z"));
  });

  it("marks toolInFlight when the last assistant turn is a tool_use with no result yet", () => {
    const jsonl = [
      line({ ...BASE, type: "user", timestamp: "2026-06-12T10:00:00Z" }),
      line({
        ...BASE,
        type: "assistant",
        timestamp: "2026-06-12T10:00:05Z",
        message: { stop_reason: "tool_use" },
      }),
    ].join("\n");
    expect(parseClaudeSession(jsonl)?.toolInFlight).toBe(true);
  });

  it("clears toolInFlight once the tool_result (user turn) lands", () => {
    const jsonl = [
      line({
        ...BASE,
        type: "assistant",
        timestamp: "2026-06-12T10:00:05Z",
        message: { stop_reason: "tool_use" },
      }),
      line({ ...BASE, type: "user", timestamp: "2026-06-12T10:00:40Z" }),
    ].join("\n");
    expect(parseClaudeSession(jsonl)?.toolInFlight).toBe(false);
  });

  it("tolerates a malformed trailing line (live partial write)", () => {
    const jsonl =
      line({ ...BASE, type: "user", timestamp: "2026-06-12T10:00:00Z" }) +
      "\n" +
      '{"type":"assistant","message":{"stop_reason":"tool_'; // truncated
    const s = parseClaudeSession(jsonl);
    expect(s).not.toBeNull();
    expect(s?.sessionId).toBe("abc-123");
    expect(s?.eventCount).toBe(1); // only the valid line counted
  });

  it("returns null when no line carries a sessionId", () => {
    const jsonl = line({ type: "summary", summary: "x" });
    expect(parseClaudeSession(jsonl)).toBeNull();
  });

  it("gives the same sourceHash for identical input and a different one when it changes", () => {
    const a = line({ ...BASE, type: "user", timestamp: "2026-06-12T10:00:00Z" });
    const b = a + "\n" + line({ ...BASE, type: "assistant", timestamp: "2026-06-12T10:01:00Z", message: { stop_reason: "end_turn" } });
    expect(parseClaudeSession(a)?.sourceHash).toBe(parseClaudeSession(a)?.sourceHash);
    expect(parseClaudeSession(a)?.sourceHash).not.toBe(parseClaudeSession(b)?.sourceHash);
  });
});
