import { describe, expect, it } from "vitest";
import { applyFilters } from "@/lib/backends/beads-backend-helpers";
import type { Beat } from "@/lib/types";

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "b1",
    title: "A task",
    type: "task",
    state: "ready_for_implementation",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00Z",
    updated: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("applyFilters — state filtering", () => {
  const beats = [
    makeBeat({ id: "a", state: "ready_for_implementation" }),
    makeBeat({ id: "b", state: "implementation" }),
    makeBeat({ id: "c", state: "shipped" }),
  ];

  it("treats state='all' as no state filter (returns every state)", () => {
    const out = applyFilters(beats, { state: "all" });
    expect(out.map((b) => b.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("no filters returns everything", () => {
    expect(applyFilters(beats).length).toBe(3);
    expect(applyFilters(beats, {}).length).toBe(3);
  });

  it("an exact (non-sentinel) state still filters", () => {
    const out = applyFilters(beats, { state: "shipped" });
    expect(out.map((b) => b.id)).toEqual(["c"]);
  });
});
