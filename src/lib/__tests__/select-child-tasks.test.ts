/**
 * selectChildTasks — the per-initiative status page needs the direct child
 * beats of an initiative to render its "Tasks (N)" breakdown. The detail panel
 * was passing nothing, so every initiative read as a single unit. This pins the
 * pure selection logic that feeds the panel.
 */
import { describe, it, expect } from "vitest";
import { selectChildTasks } from "@/lib/beat-hierarchy";
import type { Beat } from "@/lib/types";

function makeBeat(overrides: Partial<Beat> & { id: string }): Beat {
  return {
    title: overrides.id,
    type: "task",
    state: "open",
    priority: 2,
    labels: [],
    created: "2025-01-01T00:00:00Z",
    updated: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("selectChildTasks", () => {
  it("returns the direct children of the given parent", () => {
    const beats = [
      makeBeat({ id: "init" }),
      makeBeat({ id: "t1", parent: "init" }),
      makeBeat({ id: "t2", parent: "init" }),
    ];
    expect(selectChildTasks(beats, "init").map((b) => b.id)).toEqual([
      "t1",
      "t2",
    ]);
  });

  it("excludes beats parented elsewhere or with no parent", () => {
    const beats = [
      makeBeat({ id: "init" }),
      makeBeat({ id: "mine", parent: "init" }),
      makeBeat({ id: "other", parent: "different" }),
      makeBeat({ id: "orphan" }),
    ];
    expect(selectChildTasks(beats, "init").map((b) => b.id)).toEqual(["mine"]);
  });
});
