/**
 * dueState — the Projects view's due-date column. Pure + hermetic (now is
 * injected): an unset due is a muted "none", a past due is "overdue" (red),
 * a future due is "set". Label is a compact "Mon DD".
 */
import { describe, it, expect } from "vitest";
import { dueState } from "@/lib/due-date";

const NOW = Date.parse("2026-06-06T12:00:00Z");

describe("dueState", () => {
  it("returns 'none' with empty label when no due date", () => {
    expect(dueState(undefined, NOW)).toEqual({ tone: "none", label: "" });
    expect(dueState("", NOW)).toEqual({ tone: "none", label: "" });
  });

  it("flags a past due date as overdue with a compact label", () => {
    const r = dueState("2026-06-01", NOW);
    expect(r.tone).toBe("overdue");
    expect(r.label).toBe("Jun 1");
  });

  it("shows a future due date as set", () => {
    const r = dueState("2026-06-10", NOW);
    expect(r.tone).toBe("set");
    expect(r.label).toBe("Jun 10");
  });

  it("treats a due date later today as set, not overdue", () => {
    const r = dueState("2026-06-06", NOW);
    expect(r.tone).toBe("set");
  });
});
