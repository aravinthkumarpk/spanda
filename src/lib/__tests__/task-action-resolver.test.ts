import { describe, expect, it } from "vitest";
import type {
  Beat,
  MemoryWorkflowDescriptor,
} from "@/lib/types";
import {
  isTerminalState,
  resolveTaskActions,
} from "@/lib/task-action-resolver";

/**
 * Tests for task-action-resolver — the pure loom-derived Complete/terminal
 * resolver. Every descriptor here uses NON-builtin terminal names ("delivered",
 * "scrapped", "archived", "wrapped") to prove the resolver never relies on the
 * hardcoded "shipped"/"abandoned"/"closed" literal sets it replaces.
 */

function makeDescriptor(
  over: Partial<MemoryWorkflowDescriptor> = {},
): MemoryWorkflowDescriptor {
  return {
    id: "wf-test",
    backingWorkflowId: "bw-test",
    label: "Test Workflow",
    mode: "granular_autonomous",
    initialState: "queued",
    states: ["queued", "doing", "delivered", "scrapped"],
    terminalStates: ["delivered", "scrapped"],
    finalCutState: "delivered",
    retakeState: "queued",
    promptProfileId: "p-test",
    ...over,
  };
}

type ResolverBeat = Pick<
  Beat,
  "state" | "profileId" | "nextActionOwnerKind" | "isAgentClaimable"
>;

function makeBeat(over: Partial<ResolverBeat> = {}): ResolverBeat {
  return {
    state: "doing",
    profileId: "p-test",
    nextActionOwnerKind: "agent",
    isAgentClaimable: true,
    ...over,
  };
}

describe("isTerminalState", () => {
  it("returns true for a state in terminalStates", () => {
    const d = makeDescriptor();
    expect(isTerminalState("delivered", d)).toBe(true);
    expect(isTerminalState("scrapped", d)).toBe(true);
  });

  it("returns false for a non-terminal state", () => {
    const d = makeDescriptor();
    expect(isTerminalState("doing", d)).toBe(false);
    expect(isTerminalState("queued", d)).toBe(false);
  });

  it("matches case-insensitively on both sides", () => {
    const d = makeDescriptor({ terminalStates: ["Delivered", "SCRAPPED"] });
    expect(isTerminalState("delivered", d)).toBe(true);
    expect(isTerminalState("DELIVERED", d)).toBe(true);
    expect(isTerminalState("Scrapped", d)).toBe(true);
  });

  it("trims surrounding whitespace before matching", () => {
    const d = makeDescriptor();
    expect(isTerminalState("  delivered  ", d)).toBe(true);
  });

  it("returns false when descriptor is undefined", () => {
    expect(isTerminalState("delivered", undefined)).toBe(false);
  });

  it("returns false when terminalStates is empty", () => {
    const d = makeDescriptor({ terminalStates: [] });
    expect(isTerminalState("delivered", d)).toBe(false);
  });

  it("does not treat builtin literals as terminal by default", () => {
    const d = makeDescriptor();
    // "shipped"/"abandoned"/"closed" must NOT be hardcoded as terminal.
    expect(isTerminalState("shipped", d)).toBe(false);
    expect(isTerminalState("abandoned", d)).toBe(false);
    expect(isTerminalState("closed", d)).toBe(false);
  });
});

describe("resolveTaskActions", () => {
  it("marks a terminal beat as terminal, not completable", () => {
    const d = makeDescriptor();
    const r = resolveTaskActions(makeBeat({ state: "delivered" }), d);
    expect(r).toEqual({
      isTerminal: true,
      canComplete: false,
      completeTargetState: null,
    });
  });

  it("marks an abandon-style terminal beat as terminal too", () => {
    const d = makeDescriptor();
    const r = resolveTaskActions(makeBeat({ state: "scrapped" }), d);
    expect(r.isTerminal).toBe(true);
    expect(r.canComplete).toBe(false);
    expect(r.completeTargetState).toBe(null);
  });

  it("lets a non-terminal beat complete toward finalCutState", () => {
    const d = makeDescriptor();
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    expect(r).toEqual({
      isTerminal: false,
      canComplete: true,
      completeTargetState: "delivered",
    });
  });

  it("prefers finalCutState over the first terminal (no abandon pick)", () => {
    // terminalStates lists the abandon-style terminal FIRST; the resolver must
    // still target the finalCutState "done" terminal, never "scrapped".
    const d = makeDescriptor({
      terminalStates: ["scrapped", "delivered"],
      finalCutState: "delivered",
    });
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    expect(r.completeTargetState).toBe("delivered");
    expect(r.completeTargetState).not.toBe("scrapped");
  });

  it("falls back to first terminal when finalCutState is null", () => {
    const d = makeDescriptor({
      terminalStates: ["wrapped", "scrapped"],
      finalCutState: null,
    });
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    expect(r.canComplete).toBe(true);
    expect(r.completeTargetState).toBe("wrapped");
  });

  it("cannot complete when terminalStates is empty (never invents a state)", () => {
    const d = makeDescriptor({ terminalStates: [], finalCutState: null });
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    expect(r).toEqual({
      isTerminal: false,
      canComplete: false,
      completeTargetState: null,
    });
    expect(r.completeTargetState).not.toBe("shipped");
  });

  it("cannot complete when terminalStates is undefined", () => {
    const d = makeDescriptor({
      terminalStates: undefined as unknown as string[],
      finalCutState: null,
    });
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    expect(r.canComplete).toBe(false);
    expect(r.completeTargetState).toBe(null);
  });

  it("cannot classify when descriptor is undefined", () => {
    const r = resolveTaskActions(makeBeat({ state: "doing" }), undefined);
    expect(r).toEqual({
      isTerminal: false,
      canComplete: false,
      completeTargetState: null,
    });
  });

  it("classifies terminal case-insensitively", () => {
    const d = makeDescriptor({ terminalStates: ["Delivered", "Scrapped"] });
    const r = resolveTaskActions(makeBeat({ state: "DELIVERED" }), d);
    expect(r.isTerminal).toBe(true);
    expect(r.canComplete).toBe(false);
  });

  it("preserves the original-cased completeTargetState from the descriptor", () => {
    const d = makeDescriptor({
      terminalStates: ["Delivered", "Scrapped"],
      finalCutState: "Delivered",
    });
    const r = resolveTaskActions(makeBeat({ state: "doing" }), d);
    // Target should be the descriptor's value verbatim, not a normalized form.
    expect(r.completeTargetState).toBe("Delivered");
  });

  it("does not classify builtin literals as terminal for a custom loom", () => {
    const d = makeDescriptor();
    const r = resolveTaskActions(makeBeat({ state: "shipped" }), d);
    expect(r.isTerminal).toBe(false);
    expect(r.canComplete).toBe(true);
    expect(r.completeTargetState).toBe("delivered");
  });
});
