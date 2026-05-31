/**
 * F1 (iteration 2.2) — the list state-filter. The dogfood RCA: `state=all`
 * fell through to an exact `beat.state !== "all"` match and dropped every beat
 * (empty board / Codex saw nothing). `all` (and empty) must mean NO filter;
 * the `queued`/`in_action` buckets map to loom phases; a raw state is exact.
 */

import { describe, expect, it } from "vitest";
import { applyWorkflowFilters } from "@/lib/bd-queries";
import type { Beat } from "@/lib/types";

function beat(id: string, state: string, extra: Partial<Beat> = {}): Beat {
  return {
    id,
    title: id,
    type: "work",
    state,
    profileId: "do",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...extra,
  };
}

// A spread across the `do` lifecycle: a queue state, an action state, a gate.
const beats: Beat[] = [
  beat("a", "ready_for_implementation"), // queued phase
  beat("b", "implementation"), // active phase
  beat("c", "ready_for_plan_review", { requiresHumanAction: true }), // gate
  beat("d", "shipped"), // terminal
];

describe("applyWorkflowFilters — state (F1)", () => {
  it("state=all is NOT a filter — returns every beat", () => {
    expect(applyWorkflowFilters(beats, { state: "all" })).toHaveLength(
      beats.length,
    );
  });

  it("no state filter returns every beat", () => {
    expect(applyWorkflowFilters(beats, {})).toHaveLength(beats.length);
    expect(applyWorkflowFilters(beats, undefined)).toHaveLength(beats.length);
  });

  it("state=queued keeps only queue-phase beats", () => {
    const ids = applyWorkflowFilters(beats, { state: "queued" }).map(
      (b) => b.id,
    );
    expect(ids).toContain("a");
    expect(ids).not.toContain("b");
  });

  it("state=in_action keeps only active-phase beats", () => {
    const ids = applyWorkflowFilters(beats, { state: "in_action" }).map(
      (b) => b.id,
    );
    expect(ids).toContain("b");
    expect(ids).not.toContain("a");
  });

  it("a raw workflow state matches exactly", () => {
    const out = applyWorkflowFilters(beats, { state: "shipped" });
    expect(out.map((b) => b.id)).toEqual(["d"]);
  });

  it("requiresHumanAction=true still narrows to the gate", () => {
    const out = applyWorkflowFilters(beats, {
      state: "all",
      requiresHumanAction: "true",
    });
    expect(out.map((b) => b.id)).toEqual(["c"]);
  });
});
