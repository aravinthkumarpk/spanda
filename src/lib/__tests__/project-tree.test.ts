import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyBeatRole,
  groupIntoProjectTree,
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

  it("honors an explicit altitude:* label over structure (ADR-0003)", () => {
    // The empty-initiative gap: a spec'd initiative with no children would
    // structurally read as a task; the altitude:initiative label fixes it.
    const initiative = makeBeat("i", { labels: ["altitude:initiative"] });
    expect(
      classifyBeatRole(initiative, {
        hasParentInSet: false,
        hasChildren: false,
      }),
    ).toBe("initiative");

    const project = makeBeat("p", { labels: ["altitude:project"] });
    expect(
      classifyBeatRole(project, { hasParentInSet: true, hasChildren: false }),
    ).toBe("project");

    const task = makeBeat("t", { labels: ["altitude:task"] });
    expect(
      classifyBeatRole(task, { hasParentInSet: false, hasChildren: true }),
    ).toBe("task");
  });

  it("falls back to structure for a malformed/absent altitude label", () => {
    const bad = makeBeat("b", { labels: ["altitude:", "altitude:bogus"] });
    expect(
      classifyBeatRole(bad, { hasParentInSet: true, hasChildren: true }),
    ).toBe("initiative");
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

  it("classifies only on the altitude:* label, never on type or other labels", () => {
    const src = readFileSync(
      new URL("../project-tree.ts", import.meta.url),
      "utf8",
    );
    // Never reads beat.type for classification.
    expect(src).not.toMatch(/\.type\b/);
    // The only label literal the classifier keys off is the altitude prefix.
    expect(src).toContain('"altitude:"');
    expect(src).not.toMatch(/"project:"|"work:"/);
  });
});
