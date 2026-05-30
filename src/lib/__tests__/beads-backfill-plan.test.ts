import { describe, it, expect } from "vitest";
import {
  planBackfill,
  type BeadSnapshot,
  type ProjectRoot,
  type BackfillPlan,
} from "@/lib/beads-backfill-plan";

/**
 * Fixtures mirror the real personal-os shape described in SPANDA_PLAN.md's
 * "Reality check against the live DB": flat agent-studio tasks, work:coord
 * rows (the old spelling), unbucketed leaves, and unbucketed parents.
 * All data is in-memory; no fs / env / clock / network.
 */

function leaf(
  id: string,
  labels: string[],
  parentId: string | null = null,
): BeadSnapshot {
  return { id, labels, parentId, type: "task", hasChildren: false };
}

function parent(
  id: string,
  labels: string[],
  parentId: string | null = null,
): BeadSnapshot {
  return { id, labels, parentId, type: "epic", hasChildren: true };
}

const ROOTS: ProjectRoot[] = [
  { id: "root-agent-studio", project: "project:agent-studio" },
  { id: "root-ai-transformation", project: "project:ai-transformation" },
  { id: "root-personal", project: "project:personal" },
];

describe("planBackfill — reparenting flat tasks", () => {
  it("reparents a still-flat task under its existing project root", () => {
    const beads: BeadSnapshot[] = [
      leaf("t1", ["project:agent-studio", "work:do"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.reparents).toEqual([
      {
        child: "t1",
        parent: "root-agent-studio",
        project: "project:agent-studio",
      },
    ]);
    expect(plan.summary.toReparent).toBe(1);
  });

  it("is idempotent: already-parented tasks are skipped, not reparented", () => {
    const beads: BeadSnapshot[] = [
      leaf("t1", ["project:agent-studio", "work:do"], "root-agent-studio"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.reparents).toHaveLength(0);
    expect(plan.summary.alreadyParented).toBe(1);
    expect(plan.skipped.some((s) => s.id === "t1")).toBe(true);
  });

  it("reparents many flat tasks across several projects", () => {
    const beads: BeadSnapshot[] = [
      leaf("a1", ["project:agent-studio", "work:do"]),
      leaf("a2", ["project:agent-studio", "work:do"]),
      leaf("b1", ["project:ai-transformation", "work:do"]),
      leaf("c1", ["project:personal", "work:do"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.summary.toReparent).toBe(4);
    expect(plan.reparents.map((r) => r.parent)).toEqual([
      "root-agent-studio",
      "root-agent-studio",
      "root-ai-transformation",
      "root-personal",
    ]);
  });

  it("does not reparent tasks that have no project:* label", () => {
    const beads: BeadSnapshot[] = [leaf("orphan", ["work:do"])];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.reparents).toHaveLength(0);
    expect(plan.projectRootsMissing).toHaveLength(0);
    expect(plan.skipped.some((s) => s.id === "orphan")).toBe(true);
  });
});

describe("planBackfill — missing project roots (FAIL LOUD, no invention)", () => {
  it("routes a flat task whose project root is absent to projectRootsMissing", () => {
    const beads: BeadSnapshot[] = [
      leaf("x1", ["project:mystery", "work:do"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.reparents).toHaveLength(0);
    expect(plan.projectRootsMissing).toEqual(["project:mystery"]);
    expect(plan.summary.rootsMissing).toBe(1);
  });

  it("never invents a root id and dedupes missing roots", () => {
    const beads: BeadSnapshot[] = [
      leaf("x1", ["project:mystery"]),
      leaf("x2", ["project:mystery"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.projectRootsMissing).toEqual(["project:mystery"]);
    expect(
      plan.reparents.every((r) => typeof r.parent === "string" && r.parent),
    ).toBe(true);
  });

  it("does not flag a missing root when the task is already parented", () => {
    const beads: BeadSnapshot[] = [
      leaf("x1", ["project:mystery"], "some-existing-parent"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.projectRootsMissing).toHaveLength(0);
    expect(plan.summary.alreadyParented).toBe(1);
  });
});

describe("planBackfill — work:coord -> work:coordinate normalization", () => {
  it("relabels work:coord to work:coordinate", () => {
    const beads: BeadSnapshot[] = [
      leaf("c1", ["project:personal", "work:coord"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.relabels).toContainEqual({
      id: "c1",
      add: ["work:coordinate"],
      remove: ["work:coord"],
    });
    expect(plan.summary.coordRelabels).toBe(1);
  });

  it("is idempotent: work:coordinate present already produces no relabel", () => {
    const beads: BeadSnapshot[] = [
      leaf("c1", ["project:personal", "work:coordinate"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.relabels).toHaveLength(0);
    expect(plan.summary.coordRelabels).toBe(0);
  });

  it("if both work:coord and work:coordinate present, only removes work:coord", () => {
    const beads: BeadSnapshot[] = [
      leaf(
        "c1",
        ["project:personal", "work:coord", "work:coordinate"],
        "root-personal",
      ),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.relabels).toContainEqual({
      id: "c1",
      add: [],
      remove: ["work:coord"],
    });
  });

  it("a work:coord task counts as bucketed: no defaultBucket added", () => {
    const beads: BeadSnapshot[] = [
      leaf("c1", ["project:personal", "work:coord"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS);
    const relabel = plan.relabels.find((r) => r.id === "c1");
    expect(relabel?.add).not.toContain("work:do");
    expect(plan.summary.bucketed).toBe(0);
  });
});

describe("planBackfill — bucketing unbucketed leaf tasks", () => {
  it("adds the default bucket work:do to an unbucketed leaf", () => {
    const beads: BeadSnapshot[] = [
      leaf("u1", ["project:personal"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.relabels).toContainEqual({
      id: "u1",
      add: ["work:do"],
      remove: [],
    });
    expect(plan.summary.bucketed).toBe(1);
  });

  it("honours opts.defaultBucket override", () => {
    const beads: BeadSnapshot[] = [
      leaf("u1", ["project:personal"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS, { defaultBucket: "work:followup" });
    expect(plan.relabels).toContainEqual({
      id: "u1",
      add: ["work:followup"],
      remove: [],
    });
  });

  it("does NOT bucket an unbucketed PARENT (epic) — buckets are a leaf concern", () => {
    const beads: BeadSnapshot[] = [
      parent("epic1", ["project:agent-studio"], "root-agent-studio"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.relabels).toHaveLength(0);
    expect(plan.summary.bucketed).toBe(0);
    expect(
      plan.skipped.some(
        (s) => s.id === "epic1" && /parent/i.test(s.reason),
      ),
    ).toBe(true);
  });

  it("is idempotent: an already-bucketed leaf produces no bucket relabel", () => {
    const beads: BeadSnapshot[] = [
      leaf("u1", ["project:personal", "work:followup"], "root-personal"),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.summary.bucketed).toBe(0);
    expect(plan.relabels).toHaveLength(0);
  });

  it("FAILS LOUD when defaultBucket is not a work:* label", () => {
    const beads: BeadSnapshot[] = [
      leaf("u1", ["project:personal"], "root-personal"),
    ];
    expect(() =>
      planBackfill(beads, ROOTS, { defaultBucket: "nonsense" }),
    ).toThrow(/FOOLERY/);
  });

  it("FAILS LOUD when defaultBucket is an empty string", () => {
    const beads: BeadSnapshot[] = [
      leaf("u1", ["project:personal"], "root-personal"),
    ];
    expect(() =>
      planBackfill(beads, ROOTS, { defaultBucket: "" }),
    ).toThrow(/FOOLERY/);
  });
});

describe("planBackfill — combined relabel (reparent + bucket in one row)", () => {
  it("a flat unbucketed leaf is both reparented and bucketed", () => {
    const beads: BeadSnapshot[] = [leaf("t1", ["project:agent-studio"])];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.reparents).toContainEqual({
      child: "t1",
      parent: "root-agent-studio",
      project: "project:agent-studio",
    });
    expect(plan.relabels).toContainEqual({
      id: "t1",
      add: ["work:do"],
      remove: [],
    });
  });

  it("a flat work:coord leaf is reparented AND relabeled coord->coordinate", () => {
    const beads: BeadSnapshot[] = [
      leaf("t1", ["project:agent-studio", "work:coord"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    expect(plan.summary.toReparent).toBe(1);
    expect(plan.relabels).toContainEqual({
      id: "t1",
      add: ["work:coordinate"],
      remove: ["work:coord"],
    });
    expect(plan.summary.bucketed).toBe(0);
  });
});

describe("planBackfill — multiple project:* labels (deterministic pick)", () => {
  it("picks deterministically (sorted) and notes the ambiguity in skipped", () => {
    const beads: BeadSnapshot[] = [
      leaf("m1", ["project:personal", "project:agent-studio"]),
    ];
    const plan = planBackfill(beads, ROOTS);
    // Sorted ascending -> "project:agent-studio" wins.
    expect(plan.reparents).toContainEqual({
      child: "m1",
      parent: "root-agent-studio",
      project: "project:agent-studio",
    });
    expect(
      plan.skipped.some(
        (s) => s.id === "m1" && /multiple|ambig/i.test(s.reason),
      ),
    ).toBe(true);
  });

  it("deterministic pick is stable regardless of label input order", () => {
    const a = planBackfill(
      [leaf("m1", ["project:agent-studio", "project:personal"])],
      ROOTS,
    );
    const b = planBackfill(
      [leaf("m1", ["project:personal", "project:agent-studio"])],
      ROOTS,
    );
    expect(a.reparents).toEqual(b.reparents);
  });
});

describe("planBackfill — summary + full idempotency on post-applied snapshot", () => {
  function realisticSnapshot(): BeadSnapshot[] {
    return [
      leaf("a1", ["project:agent-studio", "work:do"]),
      leaf("a2", ["project:agent-studio", "work:coord"]),
      leaf("a3", ["project:agent-studio"]),
      parent("a-epic", ["project:agent-studio"]),
      leaf("b1", ["project:ai-transformation", "work:followup"]),
      leaf("p1", ["project:personal", "work:do"], "root-personal"),
    ];
  }

  it("summary totals reconcile", () => {
    const plan = planBackfill(realisticSnapshot(), ROOTS);
    expect(plan.summary.totalBeads).toBe(6);
    expect(plan.summary.alreadyParented).toBe(1);
    // a1, a2, a3, a-epic (flat parent still nests under its root), b1 -> 5.
    expect(plan.summary.toReparent).toBe(5);
    expect(plan.summary.coordRelabels).toBe(1);
    // a3 is the only unbucketed leaf; a-epic is a parent (not bucketed).
    expect(plan.summary.bucketed).toBe(1);
    expect(plan.summary.rootsMissing).toBe(0);
  });

  it("re-running over a post-applied snapshot yields empty reparents/relabels", () => {
    const first = planBackfill(realisticSnapshot(), ROOTS);
    const applied = applyPlan(realisticSnapshot(), first);
    const second = planBackfill(applied, ROOTS);
    expect(second.reparents).toHaveLength(0);
    expect(second.relabels).toHaveLength(0);
    expect(second.summary.toReparent).toBe(0);
    expect(second.summary.coordRelabels).toBe(0);
    expect(second.summary.bucketed).toBe(0);
  });
});

describe("planBackfill — input validation (CONFIG fail loud)", () => {
  it("throws FOOLERY when two roots claim the same project", () => {
    const dupRoots: ProjectRoot[] = [
      { id: "r1", project: "project:personal" },
      { id: "r2", project: "project:personal" },
    ];
    expect(() => planBackfill([], dupRoots)).toThrow(/FOOLERY/);
  });
});

/**
 * Minimal in-memory plan applier used only to prove idempotency: applies the
 * plan to a fresh snapshot copy so the second planBackfill sees post-applied
 * state. Lives in the test, not the module (executor is out of scope).
 */
function applyPlan(beads: BeadSnapshot[], plan: BackfillPlan): BeadSnapshot[] {
  const parentById = new Map(plan.reparents.map((r) => [r.child, r.parent]));
  const relabelById = new Map(plan.relabels.map((r) => [r.id, r]));
  return beads.map((b) => {
    const next: BeadSnapshot = { ...b, labels: [...b.labels] };
    const newParent = parentById.get(b.id);
    if (newParent) next.parentId = newParent;
    const rel = relabelById.get(b.id);
    if (rel) {
      next.labels = next.labels.filter((l) => !rel.remove.includes(l));
      for (const add of rel.add) {
        if (!next.labels.includes(add)) next.labels.push(add);
      }
    }
    return next;
  });
}
