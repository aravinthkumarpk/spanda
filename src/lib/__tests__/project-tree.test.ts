import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyBeatRole,
  groupIntoProjectTree,
  withAltitudeLabel,
  withProjectLabel,
  hasProjectLabel,
} from "@/lib/project-tree";
import type { Beat } from "@/lib/types";

function makeBeat(
  id: string,
  overrides: Partial<Beat> = {},
): Beat {
  return {
    id,
    title: id,
    type: "work",
    state: "ready_for_planning",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("classifyBeatRole", () => {
  it("classifies no-parent + children as a project", () => {
    const beat = makeBeat("p");
    expect(
      classifyBeatRole(beat, { hasParentInSet: false, hasChildren: true }),
    ).toBe("project");
  });

  it("classifies parent + children as an initiative", () => {
    const beat = makeBeat("i");
    expect(
      classifyBeatRole(beat, { hasParentInSet: true, hasChildren: true }),
    ).toBe("initiative");
  });

  it("classifies parent + no children as a task", () => {
    const beat = makeBeat("t");
    expect(
      classifyBeatRole(beat, { hasParentInSet: true, hasChildren: false }),
    ).toBe("task");
  });

  it("classifies no-parent + no children as a task (lone leaf)", () => {
    const beat = makeBeat("t");
    expect(
      classifyBeatRole(beat, { hasParentInSet: false, hasChildren: false }),
    ).toBe("task");
  });

  it("ignores non-altitude labels and type when classifying", () => {
    const labelled = makeBeat("x", {
      labels: ["project:foo", "work:do"],
      type: "task",
    });
    // Structure says task (no parent, no children) regardless of labels/type.
    expect(
      classifyBeatRole(labelled, { hasParentInSet: false, hasChildren: false }),
    ).toBe("task");
    // Structure says project regardless of a "task" type or non-project labels.
    expect(
      classifyBeatRole(labelled, { hasParentInSet: false, hasChildren: true }),
    ).toBe("project");
  });

  it("uses the altitude:* label to disambiguate a CHILDLESS beat (ADR-0004)", () => {
    // The empty-initiative gap: a spec'd initiative with no children would
    // structurally read as a task; the altitude:initiative label fixes it.
    const initiative = makeBeat("i", { labels: ["altitude:initiative"] });
    expect(
      classifyBeatRole(initiative, {
        hasParentInSet: false,
        hasChildren: false,
      }),
    ).toBe("initiative");

    // An empty (childless) project, e.g. a freshly-created grouping.
    const project = makeBeat("p", { labels: ["altitude:project"] });
    expect(
      classifyBeatRole(project, { hasParentInSet: false, hasChildren: false }),
    ).toBe("project");
  });

  it("lets STRUCTURE win once a beat has children (label can't freeze it)", () => {
    // ADR-0004: a top-level beat stamped altitude:initiative at create that
    // later grows children is a container — structure (no-parent + children =
    // project) takes back over; the stale label is ignored.
    const grown = makeBeat("g", { labels: ["altitude:initiative"] });
    expect(
      classifyBeatRole(grown, { hasParentInSet: false, hasChildren: true }),
    ).toBe("project");
    // And a parented container is an initiative regardless of any label.
    const nested = makeBeat("n", { labels: ["altitude:task"] });
    expect(
      classifyBeatRole(nested, { hasParentInSet: true, hasChildren: true }),
    ).toBe("initiative");
  });

  it("falls back to task for a childless beat with no/ malformed altitude", () => {
    const bad = makeBeat("b", { labels: ["altitude:", "altitude:bogus"] });
    expect(
      classifyBeatRole(bad, { hasParentInSet: true, hasChildren: false }),
    ).toBe("task");
  });
});

describe("withAltitudeLabel (ADR-0004 create-time stamping)", () => {
  it("adds the altitude label, preserving other labels", () => {
    expect(withAltitudeLabel(["work:do"], "initiative")).toEqual([
      "work:do",
      "altitude:initiative",
    ]);
  });

  it("is idempotent — replaces any existing altitude label", () => {
    expect(
      withAltitudeLabel(["altitude:task", "work:do"], "initiative"),
    ).toEqual(["work:do", "altitude:initiative"]);
  });

  it("handles undefined labels", () => {
    expect(withAltitudeLabel(undefined, "project")).toEqual([
      "altitude:project",
    ]);
  });

  it("round-trips through classifyBeatRole for a childless beat", () => {
    const beat = makeBeat("i", {
      labels: withAltitudeLabel([], "initiative"),
    });
    expect(
      classifyBeatRole(beat, { hasParentInSet: false, hasChildren: false }),
    ).toBe("initiative");
  });
});

describe("withProjectLabel / hasProjectLabel (F3 — bd-lint create gate)", () => {
  it("adds project:<name>, preserving other labels", () => {
    expect(withProjectLabel(["work:do"], "Agent Studio")).toEqual([
      "work:do",
      "project:Agent Studio",
    ]);
  });

  it("is idempotent — replaces an existing project label", () => {
    expect(withProjectLabel(["project:old", "work:do"], "new")).toEqual([
      "work:do",
      "project:new",
    ]);
  });

  it("a blank project name is a no-op (no empty label)", () => {
    expect(withProjectLabel(["work:do"], "  ")).toEqual(["work:do"]);
  });

  it("hasProjectLabel detects a real project label only", () => {
    expect(hasProjectLabel(["project:x"])).toBe(true);
    expect(hasProjectLabel(["project:"])).toBe(false);
    expect(hasProjectLabel(["work:do"])).toBe(false);
    expect(hasProjectLabel(undefined)).toBe(false);
  });
});

describe("groupIntoProjectTree", () => {
  it("returns empty projects and an empty unsorted bucket for empty input", () => {
    const tree = groupIntoProjectTree([]);
    expect(tree.projects).toEqual([]);
    expect(tree.unsorted.id).toBe("__unsorted__");
    expect(tree.unsorted.initiatives).toEqual([]);
    expect(tree.unsorted.tasks).toEqual([]);
  });

  it("builds a Project -> Initiative -> Task tree off native parent edges", () => {
    const beats = [
      makeBeat("proj", { title: "My Project" }),
      makeBeat("init", { parent: "proj", title: "An Initiative" }),
      makeBeat("leaf-task", { parent: "proj", title: "Direct Task" }),
      makeBeat("sub-task", { parent: "init", title: "Sub Task" }),
    ];
    const tree = groupIntoProjectTree(beats);

    expect(tree.projects).toHaveLength(1);
    const project = tree.projects[0];
    expect(project.id).toBe("proj");
    expect(project.title).toBe("My Project");

    // Direct leaf child -> project.tasks
    expect(project.tasks.map((t) => t.id)).toEqual(["leaf-task"]);

    // Sub-parent -> project.initiatives
    expect(project.initiatives.map((i) => i.id)).toEqual(["init"]);
    const initiative = project.initiatives[0];
    expect(initiative.title).toBe("An Initiative");

    // Initiative's own children -> initiative.tasks
    expect(initiative.tasks.map((t) => t.id)).toEqual(["sub-task"]);

    expect(tree.unsorted.tasks).toEqual([]);
    expect(tree.unsorted.initiatives).toEqual([]);
  });

  it("uses the parent bead's own title for the project node (not a project:* label)", () => {
    const beats = [
      makeBeat("proj", {
        title: "Real Title",
        labels: ["project:misleading-label"],
      }),
      makeBeat("task", { parent: "proj" }),
    ];
    const tree = groupIntoProjectTree(beats);
    expect(tree.projects[0].title).toBe("Real Title");
  });

  it("places a task whose parent id is absent from the set into unsorted", () => {
    const beats = [makeBeat("orphan", { parent: "missing-parent" })];
    const tree = groupIntoProjectTree(beats);
    expect(tree.projects).toEqual([]);
    expect(tree.unsorted.tasks.map((t) => t.id)).toEqual(["orphan"]);
  });

  it("places a parentless task into unsorted (never a project)", () => {
    const beats = [makeBeat("lonely")];
    const tree = groupIntoProjectTree(beats);
    expect(tree.projects).toEqual([]);
    expect(tree.unsorted.tasks.map((t) => t.id)).toEqual(["lonely"]);
  });

  it("never drops a beat — orphans land in unsorted", () => {
    const beats = [
      makeBeat("proj"),
      makeBeat("kid", { parent: "proj" }),
      makeBeat("orphan-a", { parent: "ghost" }),
      makeBeat("orphan-b"),
    ];
    const tree = groupIntoProjectTree(beats);
    const placed = new Set<string>();
    for (const p of [...tree.projects, tree.unsorted]) {
      for (const t of p.tasks) placed.add(t.id);
      for (const i of p.initiatives) {
        for (const t of i.tasks) placed.add(t.id);
      }
    }
    expect(placed.has("kid")).toBe(true);
    expect(placed.has("orphan-a")).toBe(true);
    expect(placed.has("orphan-b")).toBe(true);
  });

  it("attaches the underlying Beat to every node", () => {
    const projBeat = makeBeat("proj");
    const initBeat = makeBeat("init", { parent: "proj" });
    const taskBeat = makeBeat("sub", { parent: "init" });
    const tree = groupIntoProjectTree([projBeat, initBeat, taskBeat]);
    const project = tree.projects[0];
    expect(project.beat.id).toBe("proj");
    expect(project.initiatives[0].beat.id).toBe("init");
    expect(project.initiatives[0].tasks[0].beat.id).toBe("sub");
  });

  it("honours the unsortedProjectId option for the sentinel", () => {
    const tree = groupIntoProjectTree([makeBeat("x")], {
      unsortedProjectId: "__custom__",
    });
    expect(tree.unsorted.id).toBe("__custom__");
    expect(tree.unsorted.tasks.map((t) => t.id)).toEqual(["x"]);
  });

});

describe("groupIntoProjectTree ordering and cycles", () => {
  it("orders sibling projects, initiatives, and tasks by input order by default", () => {
    const beats = [
      makeBeat("p2", { title: "Project Two" }),
      makeBeat("p1", { title: "Project One" }),
      makeBeat("p2-task-b", { parent: "p2" }),
      makeBeat("p2-task-a", { parent: "p2" }),
      makeBeat("p1-init-z", { parent: "p1" }),
      makeBeat("p1-init-a", { parent: "p1" }),
      makeBeat("zchild", { parent: "p1-init-z" }),
      makeBeat("achild", { parent: "p1-init-a" }),
    ];
    const tree = groupIntoProjectTree(beats);
    expect(tree.projects.map((p) => p.id)).toEqual(["p2", "p1"]);
    const p2 = tree.projects[0];
    expect(p2.tasks.map((t) => t.id)).toEqual(["p2-task-b", "p2-task-a"]);
    const p1 = tree.projects[1];
    expect(p1.initiatives.map((i) => i.id)).toEqual(["p1-init-z", "p1-init-a"]);
  });

  it("does not loop on cyclic parent references", () => {
    // a -> b -> a cycle; buildHierarchy guards with a visited set.
    const beats = [
      makeBeat("a", { parent: "b" }),
      makeBeat("b", { parent: "a" }),
    ];
    // Must terminate and never throw.
    const tree = groupIntoProjectTree(beats);
    const allIds = new Set<string>();
    for (const p of [...tree.projects, tree.unsorted]) {
      allIds.add(p.id);
      for (const t of p.tasks) allIds.add(t.id);
      for (const i of p.initiatives) {
        allIds.add(i.id);
        for (const t of i.tasks) allIds.add(t.id);
      }
    }
    // At least one of the cycle members surfaces; we never infinite-loop.
    expect(allIds.size).toBeGreaterThan(0);
  });

  it("keeps a deep grandchild under its initiative, not the project root", () => {
    const beats = [
      makeBeat("proj"),
      makeBeat("init", { parent: "proj" }),
      makeBeat("grand", { parent: "init" }),
    ];
    const tree = groupIntoProjectTree(beats);
    const project = tree.projects[0];
    expect(project.tasks).toEqual([]);
    expect(project.initiatives[0].tasks.map((t) => t.id)).toEqual(["grand"]);
  });
});

describe("project-tree hermetic imports", () => {
  it("does not reach for host env, fs, network, clock, or RNG in logic", () => {
    const src = readFileSync(
      new URL("../project-tree.ts", import.meta.url),
      "utf8",
    );
    expect(src).not.toMatch(/process\.env/);
    expect(src).not.toMatch(/Date\.now|new Date\(\)/);
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/require\(["']fs["']\)|from ["']node:fs["']/);
    expect(src).not.toMatch(/fetch\(|require\(["']node:net["']\)/);
  });

  it("classifyBeatRole never keys on type or non-altitude labels (behavioural)", () => {
    // The module legitimately mentions "project:" (withProjectLabel) and never
    // reads beat.type, so assert the CLASSIFIER's behaviour rather than scan the
    // whole file: a project:* / work:* label must not change classification —
    // only altitude:* and structure do.
    const labelled = makeBeat("x", {
      labels: ["project:foo", "work:do"],
      type: "epic",
    });
    // childless + non-altitude labels -> task (structure)
    expect(
      classifyBeatRole(labelled, { hasParentInSet: true, hasChildren: false }),
    ).toBe("task");
    // children present -> structure decides regardless of labels/type
    expect(
      classifyBeatRole(labelled, { hasParentInSet: false, hasChildren: true }),
    ).toBe("project");
    // and the altitude label is the only label that flips a childless beat
    const a = makeBeat("y", { labels: ["project:foo", "altitude:initiative"] });
    expect(
      classifyBeatRole(a, { hasParentInSet: false, hasChildren: false }),
    ).toBe("initiative");
  });
});
