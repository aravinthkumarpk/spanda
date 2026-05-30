/**
 * A2 (iteration 02) — the drag resolver picks the real target state for a card
 * dropped in a column, but only when the workflow already declares that move.
 * Illegal multi-step jumps resolve to null so the board never forces a
 * transition. Uses the live semiauto descriptor (no hardcoded state names).
 */

import { describe, expect, it } from "vitest";
import { resolveDropTarget } from "@/components/board-drag-target";
import { builtinProfileDescriptor } from "@/lib/workflows";
import type { Beat } from "@/lib/types";

const semiauto = builtinProfileDescriptor("semiauto");

function beat(state: string): Beat {
  return {
    id: "b",
    title: "b",
    type: "work",
    state,
    profileId: "semiauto",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
  };
}

describe("resolveDropTarget", () => {
  it("To do → Doing advances a queue state to its action state", () => {
    // ready_for_planning (To do) dropped on Doing → planning.
    const r = resolveDropTarget(beat("ready_for_planning"), "doing", semiauto);
    expect(r?.targetState).toBe("planning");
    expect(r?.isTerminal).toBe(false);
  });

  it("Doing → Review advances an action state to its review queue", () => {
    // planning (Doing) dropped on Review → ready_for_plan_review.
    const r = resolveDropTarget(beat("planning"), "review", semiauto);
    expect(r?.targetState).toBe("ready_for_plan_review");
  });

  it("returns null for a no-op drop into the same column", () => {
    // ready_for_planning is already in To do.
    expect(resolveDropTarget(beat("ready_for_planning"), "todo", semiauto))
      .toBeNull();
  });

  it("returns null for an illegal multi-step jump (To do → Done)", () => {
    expect(resolveDropTarget(beat("ready_for_planning"), "done", semiauto))
      .toBeNull();
  });

  it("flags a terminal drop so the UI can confirm first", () => {
    // shipment_review (Doing) → shipped (Done) is a declared transition.
    const r = resolveDropTarget(beat("shipment_review"), "done", semiauto);
    expect(r?.targetState).toBe("shipped");
    expect(r?.isTerminal).toBe(true);
  });

  it("returns null when the beat has no state", () => {
    expect(resolveDropTarget(beat(""), "doing", semiauto)).toBeNull();
  });
});
