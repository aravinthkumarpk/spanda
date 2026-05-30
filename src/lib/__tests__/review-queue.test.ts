/**
 * D5 (ADR-0004) — the Review queue is exactly the beats whose next action is
 * the human (the two gates), via the loom-derived requiresHumanAction flag.
 */

import { describe, expect, it } from "vitest";
import { gateBeats } from "@/lib/review-queue";
import type { Beat } from "@/lib/types";

function beat(id: string, requiresHumanAction: boolean): Beat {
  return {
    id,
    title: id,
    type: "work",
    state: "ready_for_plan_review",
    priority: 2,
    labels: [],
    requiresHumanAction,
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
  };
}

describe("gateBeats", () => {
  it("keeps only beats waiting on the human, preserving order", () => {
    const all = [
      beat("gate-a", true),
      beat("running-b", false),
      beat("gate-c", true),
    ];
    expect(gateBeats(all).map((b) => b.id)).toEqual(["gate-a", "gate-c"]);
  });

  it("returns nothing when no gate is waiting", () => {
    expect(gateBeats([beat("x", false)])).toEqual([]);
  });
});
