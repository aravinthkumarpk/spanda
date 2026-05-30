/**
 * project-health — activity-based portfolio health for a parent's children.
 *
 * Loom-derived classification: every "is this terminal / actionable?" call
 * routes through an injected `resolveDescriptor`. These tests deliberately
 * use state names that do NOT match any builtin profile (e.g. "alpha",
 * "queueZeta", "doneOmega") so a hardcoded-state-name regression would FAIL
 * here rather than pass on a builtin convention.
 *
 * Hermetic: `now` is injected; in-memory Beat fixtures only.
 */

import { describe, expect, it } from "vitest";
import { classifyProjectHealth } from "@/lib/project-health";
import type {
  ActionOwnerKind,
  Beat,
  MemoryWorkflowDescriptor,
} from "@/lib/types";

const NOW = new Date("2026-05-24T18:00:00Z").getTime();
const day = 86_400_000;

function ago(days: number): string {
  return new Date(NOW - days * day).toISOString();
}

// Custom, non-builtin state vocabulary to prove loom-derivation.
const TERMINAL = "doneOmega";
const ACTION = "actionAlpha";
const QUEUE = "queueZeta";
const REVIEW = "reviewKappa";

function makeBeat(over: Partial<Beat>): Beat {
  return {
    id: over.id ?? "b1",
    title: over.title ?? "child",
    type: "work",
    state: over.state ?? ACTION,
    priority: 2,
    labels: [],
    created: ago(40),
    updated: over.updated ?? ago(1),
    ...over,
  };
}

const DESCRIPTOR: MemoryWorkflowDescriptor = {
  id: "wf",
  backingWorkflowId: "wf",
  label: "Custom",
  mode: "granular_autonomous",
  initialState: QUEUE,
  states: [QUEUE, ACTION, REVIEW, TERMINAL],
  terminalStates: [TERMINAL],
  finalCutState: null,
  retakeState: QUEUE,
  promptProfileId: "p",
  queueStates: [QUEUE, REVIEW],
  actionStates: [ACTION],
  reviewQueueStates: [REVIEW],
};

function resolve(): MemoryWorkflowDescriptor {
  return DESCRIPTOR;
}

describe("classifyProjectHealth", () => {
  it("returns 'empty' for zero children (NOT 'done')", () => {
    expect(classifyProjectHealth([], NOW, resolve)).toBe("empty");
  });

  it("'done' when ALL children are terminal", () => {
    const children = [
      makeBeat({ id: "a", state: TERMINAL, updated: ago(100) }),
      makeBeat({ id: "b", state: TERMINAL, updated: ago(2) }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("done");
  });

  it("'moving' when a non-terminal child moved recently", () => {
    const children = [
      makeBeat({ id: "a", state: ACTION, updated: ago(1) }),
      makeBeat({ id: "b", state: TERMINAL, updated: ago(50) }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("moving");
  });

  it("Done WINS over Moving: all terminal even if one moved recently", () => {
    const children = [
      makeBeat({ id: "a", state: TERMINAL, updated: ago(0) }),
      makeBeat({ id: "b", state: TERMINAL, updated: ago(50) }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("done");
  });

  it("Moving WINS over Stalled: one recent action child, one old action child", () => {
    const children = [
      makeBeat({ id: "a", state: ACTION, updated: ago(1) }),
      makeBeat({ id: "b", state: ACTION, updated: ago(30) }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("moving");
  });

  it("'stalled' when no recent movement but an action-state child is open", () => {
    const children = [
      makeBeat({ id: "a", state: ACTION, updated: ago(30) }),
      makeBeat({ id: "b", state: TERMINAL, updated: ago(50) }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("stalled");
  });

  it("'stalled' via a queue-state child with a non-'none' next owner", () => {
    const children = [
      makeBeat({
        id: "a",
        state: QUEUE,
        updated: ago(30),
        nextActionOwnerKind: "agent",
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("stalled");
  });
});

describe("classifyProjectHealth — blocked + edge cases", () => {
  it("'blocked' when open children exist, none moving, none actionable", () => {
    // QUEUE child whose next owner is 'none' is NOT actionable.
    const children = [
      makeBeat({
        id: "a",
        state: QUEUE,
        updated: ago(30),
        nextActionOwnerKind: "none",
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("blocked");
  });

  it("'blocked' when a review-queue child is stuck with no next owner", () => {
    const children = [
      makeBeat({
        id: "a",
        state: REVIEW,
        updated: ago(30),
        nextActionOwnerKind: "none",
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("blocked");
  });

  it("Blocked vs Stalled by actionability: a queue child with an owner is stalled", () => {
    const children = [
      makeBeat({
        id: "a",
        state: QUEUE,
        updated: ago(30),
        nextActionOwnerKind: "human",
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("stalled");
  });

  it("malformed updated -> not moving (fail-soft) -> stalled with an action child", () => {
    const children = [
      makeBeat({ id: "a", state: ACTION, updated: "not-a-date" }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("stalled");
  });

  it("respects a custom threshold: 5-day-old action child is moving at threshold 7", () => {
    const children = [makeBeat({ id: "a", state: ACTION, updated: ago(5) })];
    expect(classifyProjectHealth(children, NOW, resolve, 7)).toBe("moving");
  });

  it("respects a custom threshold: 5-day-old action child is stalled at threshold 3", () => {
    const children = [makeBeat({ id: "a", state: ACTION, updated: ago(5) })];
    expect(classifyProjectHealth(children, NOW, resolve, 3)).toBe("stalled");
  });

  it("a terminal child that moved recently does NOT count as moving", () => {
    // Only NON-terminal recent movement counts as moving; this leaves an
    // open, non-actionable child -> blocked.
    const children = [
      makeBeat({ id: "a", state: TERMINAL, updated: ago(0) }),
      makeBeat({
        id: "b",
        state: QUEUE,
        updated: ago(30),
        nextActionOwnerKind: "none",
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("blocked");
  });

  it("classification is loom-derived: a state named like a builtin terminal is NOT terminal here", () => {
    // "shipped" is a builtin-ish name but is NOT in this descriptor's
    // terminalStates, so a child in it must be treated as open.
    const children = [makeBeat({ id: "a", state: "shipped", updated: ago(1) })];
    // "shipped" is neither terminal, action, nor queue here -> open,
    // non-actionable, no recent NON-actionable-relevant movement matters:
    // it is non-terminal + recently updated -> moving.
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("moving");
  });

  it("propagates a throwing resolveDescriptor (no catch-and-default)", () => {
    const boom = (): MemoryWorkflowDescriptor => {
      throw new Error("descriptor unresolved");
    };
    const children = [makeBeat({ id: "a", state: ACTION })];
    expect(() => classifyProjectHealth(children, NOW, boom)).toThrow(
      /descriptor unresolved/,
    );
  });

  it("uses per-child descriptors (resolveDescriptor receives the beat)", () => {
    const terminalOf = (beat: Beat): MemoryWorkflowDescriptor => ({
      ...DESCRIPTOR,
      // Each child's own state is terminal for its own descriptor.
      terminalStates: [beat.state],
    });
    const children = [
      makeBeat({ id: "a", state: "x1", updated: ago(1) }),
      makeBeat({ id: "b", state: "x2", updated: ago(1) }),
    ];
    expect(classifyProjectHealth(children, NOW, terminalOf)).toBe("done");
  });

  it("treats an action child with no owner kind as actionable (action-state rule ignores owner)", () => {
    const children = [
      makeBeat({
        id: "a",
        state: ACTION,
        updated: ago(30),
        nextActionOwnerKind: undefined,
      }),
    ];
    expect(classifyProjectHealth(children, NOW, resolve)).toBe("stalled");
  });

  it("accepts ActionOwnerKind values without widening", () => {
    const kinds: ActionOwnerKind[] = ["agent", "human", "none"];
    expect(kinds).toHaveLength(3);
  });
});
