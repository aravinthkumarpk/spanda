import { describe, expect, it } from "vitest";
import { canTakeBeat, type TakeEligibleBeat } from "@/lib/beat-take-eligibility";
import type { MemoryWorkflowDescriptor } from "@/lib/types";

// A deliberately hand-rolled descriptor whose terminal set is NOT the
// builtin shipped/abandoned pair, proving classification is loom-derived
// (read from the descriptor) and not pattern-matched against literal names.
function descriptor(
  overrides: Partial<MemoryWorkflowDescriptor> = {},
): MemoryWorkflowDescriptor {
  return {
    id: "test",
    profileId: "test",
    backingWorkflowId: "test",
    promptProfileId: "test",
    label: "Test",
    mode: "coarse_human_gated",
    initialState: "ready_for_implementation",
    states: [
      "ready_for_implementation",
      "implementation",
      "shipped",
      "abandoned",
      "closed",
    ],
    terminalStates: ["shipped", "abandoned", "closed"],
    transitions: [],
    finalCutState: null,
    retakeState: "ready_for_implementation",
    owners: {
      planning: "none",
      plan_review: "none",
      implementation: "agent",
      implementation_review: "none",
      shipment: "none",
      shipment_review: "none",
    },
    stateOwners: {},
    queueStates: ["ready_for_implementation"],
    actionStates: ["implementation"],
    queueActions: {},
    reviewQueueStates: [],
    humanQueueStates: [],
    ...overrides,
  };
}

function makeBeat(overrides: Partial<TakeEligibleBeat> = {}): TakeEligibleBeat {
  return {
    state: "ready_for_implementation",
    type: "work",
    nextActionOwnerKind: "agent",
    isAgentClaimable: true,
    ...overrides,
  };
}

describe("canTakeBeat", () => {
  it("allows queue states like ready_for_implementation", () => {
    expect(canTakeBeat(makeBeat(), descriptor())).toBe(true);
  });

  it("blocks terminal states (loom-derived from the descriptor)", () => {
    expect(canTakeBeat(makeBeat({ state: "shipped" }), descriptor())).toBe(false);
    expect(canTakeBeat(makeBeat({ state: "abandoned" }), descriptor())).toBe(false);
    expect(canTakeBeat(makeBeat({ state: "closed" }), descriptor())).toBe(false);
  });

  it("blocks a custom terminal even with a non-builtin name", () => {
    const custom = descriptor({ terminalStates: ["done", "cancelled"] });
    expect(canTakeBeat(makeBeat({ state: "done" }), custom)).toBe(false);
    expect(canTakeBeat(makeBeat({ state: "cancelled" }), custom)).toBe(false);
  });

  it("does not treat 'shipped' as terminal when the descriptor omits it", () => {
    const custom = descriptor({ terminalStates: ["done"] });
    // A non-terminal, agent-claimable beat is takeable regardless of its name.
    expect(canTakeBeat(makeBeat({ state: "shipped" }), custom)).toBe(true);
  });

  it("allows agent-owned gate beats when they are claimable", () => {
    expect(canTakeBeat(makeBeat({ type: "gate" }), descriptor())).toBe(true);
  });

  it("blocks human-owned next actions", () => {
    expect(
      canTakeBeat(makeBeat({ nextActionOwnerKind: "human" }), descriptor()),
    ).toBe(false);
  });

  it("blocks human-owned gate beats", () => {
    expect(
      canTakeBeat(
        makeBeat({ type: "gate", nextActionOwnerKind: "human" }),
        descriptor(),
      ),
    ).toBe(false);
  });

  it("blocks beats explicitly marked not claimable", () => {
    expect(
      canTakeBeat(makeBeat({ isAgentClaimable: false }), descriptor()),
    ).toBe(false);
  });
});
