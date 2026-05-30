/**
 * D6 (ADR-0004) — at a human gate, Approve advances past it and Reject rolls it
 * back. Derived from the live `do` descriptor (no hardcoded state names).
 */

import { describe, expect, it } from "vitest";
import { gateDecisionTargets } from "@/lib/gate-decision";
import { builtinProfileDescriptor } from "@/lib/workflows";
import type { Beat } from "@/lib/types";

const doDesc = builtinProfileDescriptor("do");

function beat(state: string): Beat {
  return {
    id: "i",
    title: "i",
    type: "work",
    state,
    profileId: "do",
    priority: 2,
    labels: ["altitude:initiative"],
    requiresHumanAction: true,
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
  };
}

describe("gateDecisionTargets (do profile)", () => {
  it("Plan review: approve advances to ready_for_implementation, reject to ready_for_planning", () => {
    const t = gateDecisionTargets(beat("ready_for_plan_review"), doDesc);
    expect(t.approve).toBe("ready_for_implementation");
    expect(t.reject).toBe("ready_for_planning");
  });

  it("Execution review: approve advances to ready_for_shipment, reject to ready_for_implementation", () => {
    const t = gateDecisionTargets(
      beat("ready_for_implementation_review"),
      doDesc,
    );
    expect(t.approve).toBe("ready_for_shipment");
    expect(t.reject).toBe("ready_for_implementation");
  });

  it("works when the beat is already at the review action state", () => {
    const t = gateDecisionTargets(beat("plan_review"), doDesc);
    expect(t.approve).toBe("ready_for_implementation");
    expect(t.reject).toBe("ready_for_planning");
  });

  it("returns nothing for a non-gate state", () => {
    expect(gateDecisionTargets(beat("implementation"), doDesc)).toEqual({});
  });

  it("never offers defer/abandon as a gate decision", () => {
    const t = gateDecisionTargets(beat("ready_for_plan_review"), doDesc);
    expect(t.approve).not.toBe("abandoned");
    expect(t.reject).not.toBe("deferred");
    expect(t.reject).not.toBe("abandoned");
  });
});
