import { describe, expect, it } from "vitest";
import {
  BOARD_COLUMNS,
  boardColumnForState,
  groupBeatsByBoardColumn,
} from "@/lib/board-columns";
import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";
import { builtinProfileDescriptor } from "@/lib/workflows";

function makeBeat(
  id: string,
  state: string,
  overrides: Partial<Beat> = {},
): Beat {
  return {
    id,
    title: id,
    type: "work",
    state,
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Hand-rolled descriptor with DELIBERATELY non-builtin state names to prove
 * nothing is hardcoded against the kno `ready_for_*` naming convention.
 * - queue states: "queued_alpha", "gate_alpha" (gate is review subset)
 * - action states: "crunch_alpha"
 * - terminal states: "buried_alpha"
 * - "limbo_alpha" is a state present but unbucketed (no column).
 */
function makeDescriptor(
  overrides: Partial<MemoryWorkflowDescriptor> = {},
): MemoryWorkflowDescriptor {
  return {
    id: "alpha-profile",
    backingWorkflowId: "alpha",
    label: "Alpha",
    mode: "granular_autonomous",
    initialState: "queued_alpha",
    states: [
      "queued_alpha",
      "gate_alpha",
      "crunch_alpha",
      "buried_alpha",
      "limbo_alpha",
    ],
    terminalStates: ["buried_alpha"],
    finalCutState: null,
    retakeState: "queued_alpha",
    promptProfileId: "alpha-profile",
    queueStates: ["queued_alpha", "gate_alpha"],
    actionStates: ["crunch_alpha"],
    reviewQueueStates: ["gate_alpha"],
    ...overrides,
  };
}

describe("board-columns constants", () => {
  it("exposes exactly four columns in canonical order", () => {
    expect(BOARD_COLUMNS.map((column) => column.id)).toEqual([
      "todo",
      "doing",
      "review",
      "done",
    ]);
    expect(BOARD_COLUMNS.map((column) => column.label)).toEqual([
      "To do",
      "Doing",
      "Review",
      "Done",
    ]);
    expect(BOARD_COLUMNS).toHaveLength(4);
  });
});

describe("boardColumnForState", () => {
  const descriptor = makeDescriptor();

  it("classifies terminal states as done (terminal wins)", () => {
    expect(boardColumnForState("buried_alpha", descriptor)).toBe("done");
  });

  it("classifies a terminal state to done even if also in a queue", () => {
    const overlap = makeDescriptor({
      terminalStates: ["gate_alpha"],
    });
    // gate_alpha is in reviewQueueStates AND terminalStates -> terminal wins.
    expect(boardColumnForState("gate_alpha", overlap)).toBe("done");
  });

  it("classifies review-queue states as review before generic todo", () => {
    expect(boardColumnForState("gate_alpha", descriptor)).toBe("review");
  });

  it("classifies non-review queue states as todo", () => {
    expect(boardColumnForState("queued_alpha", descriptor)).toBe("todo");
  });

  it("classifies action states as doing", () => {
    expect(boardColumnForState("crunch_alpha", descriptor)).toBe("doing");
  });

  it("returns null for an in-descriptor but unbucketed state", () => {
    expect(boardColumnForState("limbo_alpha", descriptor)).toBeNull();
  });

  it("returns null for an unknown state", () => {
    expect(boardColumnForState("not_a_state", descriptor)).toBeNull();
  });

  it("returns null for blank/null/undefined state, never todo", () => {
    expect(boardColumnForState("   ", descriptor)).toBeNull();
    expect(boardColumnForState("", descriptor)).toBeNull();
    expect(boardColumnForState(null, descriptor)).toBeNull();
    expect(boardColumnForState(undefined, descriptor)).toBeNull();
  });

  it("normalizes mixed-case and padded input before matching", () => {
    expect(boardColumnForState("  CRUNCH_Alpha ", descriptor)).toBe("doing");
    expect(boardColumnForState("Gate_Alpha", descriptor)).toBe("review");
    expect(boardColumnForState("BURIED_ALPHA", descriptor)).toBe("done");
  });

  it("does not throw on a single classify with missing optional fields", () => {
    const sparse: MemoryWorkflowDescriptor = {
      id: "sparse",
      backingWorkflowId: "sparse",
      label: "Sparse",
      mode: "granular_autonomous",
      initialState: "queued_alpha",
      states: ["queued_alpha", "buried_alpha"],
      terminalStates: ["buried_alpha"],
      finalCutState: null,
      retakeState: "queued_alpha",
      promptProfileId: "sparse",
      // no queueStates / actionStates / reviewQueueStates
    };
    expect(boardColumnForState("buried_alpha", sparse)).toBe("done");
    expect(boardColumnForState("queued_alpha", sparse)).toBeNull();
  });

  it("prefers review over todo when both checks could match", () => {
    // gate_alpha lives in both queueStates and reviewQueueStates; review wins.
    const both = makeDescriptor({
      queueStates: ["queued_alpha", "gate_alpha"],
      reviewQueueStates: ["gate_alpha"],
    });
    expect(boardColumnForState("gate_alpha", both)).toBe("review");
    expect(boardColumnForState("queued_alpha", both)).toBe("todo");
  });
});

describe("groupBeatsByBoardColumn", () => {
  const descriptorFor = () => makeDescriptor();

  it("always returns all four column keys, even when empty", () => {
    const result = groupBeatsByBoardColumn([], descriptorFor);
    for (const column of BOARD_COLUMNS) {
      expect(result[column.id]).toEqual([]);
    }
    expect(result.unclassified).toEqual([]);
    expect(result.todo).toEqual([]);
    expect(result.doing).toEqual([]);
    expect(result.review).toEqual([]);
    expect(result.done).toEqual([]);
  });

  it("buckets beats into their classified columns", () => {
    const beats = [
      makeBeat("a", "queued_alpha"),
      makeBeat("b", "crunch_alpha"),
      makeBeat("c", "gate_alpha"),
      makeBeat("d", "buried_alpha"),
    ];
    const result = groupBeatsByBoardColumn(beats, descriptorFor);
    expect(result.todo.map((beat) => beat.id)).toEqual(["a"]);
    expect(result.doing.map((beat) => beat.id)).toEqual(["b"]);
    expect(result.review.map((beat) => beat.id)).toEqual(["c"]);
    expect(result.done.map((beat) => beat.id)).toEqual(["d"]);
  });

  it("excludes lease-type beats from the board", () => {
    const beats = [
      makeBeat("work", "queued_alpha"),
      makeBeat("lease", "queued_alpha", { type: "lease" }),
    ];
    const result = groupBeatsByBoardColumn(beats, descriptorFor);
    expect(result.todo.map((beat) => beat.id)).toEqual(["work"]);
  });

  it("orders beats in a column by priority then recency", () => {
    const beats = [
      makeBeat("low-new", "crunch_alpha", {
        priority: 4,
        updated: "2026-05-03T00:00:00.000Z",
      }),
      makeBeat("high-old", "crunch_alpha", {
        priority: 1,
        updated: "2026-05-01T00:00:00.000Z",
      }),
      makeBeat("high-new", "crunch_alpha", {
        priority: 1,
        updated: "2026-05-02T00:00:00.000Z",
      }),
    ];
    const result = groupBeatsByBoardColumn(beats, descriptorFor);
    expect(result.doing.map((beat) => beat.id)).toEqual([
      "high-new",
      "high-old",
      "low-new",
    ]);
  });

  it("resolves a per-beat descriptor", () => {
    const altDescriptor = makeDescriptor({
      id: "beta",
      states: ["queued_beta", "crunch_beta", "buried_beta"],
      terminalStates: ["buried_beta"],
      queueStates: ["queued_beta"],
      actionStates: ["crunch_beta"],
      reviewQueueStates: [],
    });
    const beats = [
      makeBeat("alpha-beat", "crunch_alpha"),
      makeBeat("beta-beat", "crunch_beta"),
    ];
    const result = groupBeatsByBoardColumn(beats, (beat) =>
      beat.id === "beta-beat" ? altDescriptor : makeDescriptor(),
    );
    expect(result.doing.map((beat) => beat.id).sort()).toEqual([
      "alpha-beat",
      "beta-beat",
    ]);
  });

});

describe("groupBeatsByBoardColumn null + broken handling", () => {
  const descriptorFor = () => makeDescriptor();

  it("surfaces null-classified beats without dropping them silently", () => {
    const beats = [
      makeBeat("ok", "queued_alpha"),
      makeBeat("limbo", "limbo_alpha"),
      makeBeat("weird", "totally_unknown"),
    ];
    const result = groupBeatsByBoardColumn(beats, descriptorFor);
    expect(result.todo.map((beat) => beat.id)).toEqual(["ok"]);
    // null-classified beats are counted/surfaced on a side channel.
    expect(result.unclassified.map((beat) => beat.id).sort()).toEqual([
      "limbo",
      "weird",
    ]);
  });

  it("orders unclassified beats by priority then recency too", () => {
    const beats = [
      makeBeat("low-new", "limbo_alpha", {
        priority: 4,
        updated: "2026-05-03T00:00:00.000Z",
      }),
      makeBeat("high-old", "limbo_alpha", {
        priority: 1,
        updated: "2026-05-01T00:00:00.000Z",
      }),
    ];
    const result = groupBeatsByBoardColumn(beats, descriptorFor);
    expect(result.unclassified.map((beat) => beat.id)).toEqual([
      "high-old",
      "low-new",
    ]);
  });

  it("throws a FOOLERY-marked error on a broken/empty loom descriptor", () => {
    const broken = makeDescriptor({
      terminalStates: [],
      queueStates: [],
      actionStates: [],
      reviewQueueStates: [],
    });
    expect(() =>
      groupBeatsByBoardColumn(
        [makeBeat("x", "queued_alpha")],
        () => broken,
      ),
    ).toThrow(/FOOLERY/);
  });
});

/**
 * B2 (ADR-0003) — the real `semiauto` profile's 7-state lifecycle must map onto
 * the normalized board with no unclassified states. A Do initiative carries
 * `profileId: semiauto`; this locks its state→column projection. Uses the live
 * builtin descriptor (not a hand-rolled one) so a drift in the semiauto profile
 * trips this test.
 */
describe("boardColumnForState — semiauto lifecycle (ADR-0003)", () => {
  const semiauto = builtinProfileDescriptor("semiauto");

  it("maps the 7 ADR lifecycle states to the normalized board", () => {
    // our term            beads state                column
    // Open                ready_for_planning         todo
    // Plan                planning                   doing
    // Plan review (gate)  plan_review                doing (active review action)
    // Execution ready     ready_for_implementation   todo
    // Executing           implementation             doing
    // Exec review (gate)  implementation_review      doing (active review action)
    // Done                shipped                    done
    expect(boardColumnForState("ready_for_planning", semiauto)).toBe("todo");
    expect(boardColumnForState("planning", semiauto)).toBe("doing");
    expect(boardColumnForState("plan_review", semiauto)).toBe("doing");
    expect(boardColumnForState("ready_for_implementation", semiauto)).toBe(
      "todo",
    );
    expect(boardColumnForState("implementation", semiauto)).toBe("doing");
    expect(boardColumnForState("implementation_review", semiauto)).toBe(
      "doing",
    );
    expect(boardColumnForState("shipped", semiauto)).toBe("done");
  });

  it("surfaces the two human gates as their review-queue states", () => {
    // While an initiative rests waiting for the human to open a gate it sits in
    // the ready_for_*_review queue, which is the board's Review column.
    expect(boardColumnForState("ready_for_plan_review", semiauto)).toBe(
      "review",
    );
    expect(
      boardColumnForState("ready_for_implementation_review", semiauto),
    ).toBe("review");
  });

  it("classifies every semiauto state (none land in unclassified)", () => {
    for (const state of semiauto.states) {
      expect(boardColumnForState(state, semiauto)).not.toBeNull();
    }
  });
});

/**
 * ADR-0004 — the redefined `do` profile (the spanda "Do" task type) runs the
 * gated lifecycle plus an agent `sign_off` step. The board must place sign_off
 * in Doing (it's agent work, not a 5th column) and surface the two gates in
 * Review, with nothing unclassified.
 */
describe("boardColumnForState — do profile (ADR-0004)", () => {
  const doDesc = builtinProfileDescriptor("do");

  it("maps the gated lifecycle, with sign_off in Doing", () => {
    expect(boardColumnForState("ready_for_planning", doDesc)).toBe("todo");
    expect(boardColumnForState("planning", doDesc)).toBe("doing");
    expect(boardColumnForState("implementation", doDesc)).toBe("doing");
    expect(boardColumnForState("sign_off", doDesc)).toBe("doing");
    expect(boardColumnForState("shipped", doDesc)).toBe("done");
  });

  it("surfaces the two gates as their review-queue states", () => {
    expect(boardColumnForState("ready_for_plan_review", doDesc)).toBe("review");
    expect(
      boardColumnForState("ready_for_implementation_review", doDesc),
    ).toBe("review");
  });

  it("classifies every do state (none land in unclassified)", () => {
    for (const state of doDesc.states) {
      expect(boardColumnForState(state, doDesc)).not.toBeNull();
    }
  });
});
