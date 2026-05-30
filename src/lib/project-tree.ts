/**
 * project-tree — pure grouping of a flat `Beat[]` into a
 * Project -> Initiative -> Task tree keyed off native `Beat.parent` edges (Q2).
 *
 * Classification honors an explicit `altitude:project|initiative|task` label
 * first (ADR-0003 — round-trips via labels, and fixes the empty-initiative gap
 * where a spec'd initiative with no children would otherwise read as a task),
 * then falls back to STRUCTURAL position in the parent graph (does it have a
 * parent in the set? does it have children?). The beat's `type` string and any
 * non-`altitude:` label are NEVER consulted. Project titles come from the
 * parent bead's own `title`, not from a `project:*` label.
 *
 * Consumes `buildHierarchy` from `beat-hierarchy.ts` (parent-first DFS that
 * sets `_depth`/`_hasChildren`, treats a missing parent as top-level, and
 * guards cycles with a visited set) rather than re-walking the graph.
 *
 * Sibling order is deterministic: input order by default (an injected
 * comparator may be threaded through `buildHierarchy` upstream if desired).
 * Parentless or orphan (dangling-parent) tasks are never dropped — they land
 * in the synthetic `unsorted` project bucket.
 */

import { buildHierarchy } from "@/lib/beat-hierarchy";
import type { HierarchicalBeat } from "@/lib/beat-hierarchy";
import type { Beat } from "@/lib/types";

export interface TaskNode {
  id: string;
  title: string;
  beat: Beat;
}

export interface InitiativeNode {
  id: string;
  title: string;
  beat: Beat;
  tasks: TaskNode[];
}

export interface ProjectNode {
  id: string;
  title: string;
  beat: Beat;
  initiatives: InitiativeNode[];
  tasks: TaskNode[];
}

export interface ProjectTree {
  projects: ProjectNode[];
  /** Synthetic project holding parentless / orphan (dangling-parent) tasks. */
  unsorted: ProjectNode;
}

export interface GroupIntoProjectTreeOptions {
  /** Reserved sentinel id for the synthetic unsorted project. */
  unsortedProjectId?: string;
}

export const DEFAULT_UNSORTED_PROJECT_ID = "__unsorted__";

export type BeatRole = "project" | "initiative" | "task";

const ALTITUDE_LABEL_PREFIX = "altitude:";
const ALTITUDE_VALUES: ReadonlySet<BeatRole> = new Set([
  "project",
  "initiative",
  "task",
]);

/**
 * Read an explicit `altitude:project|initiative|task` label if one is present
 * and well-formed (ADR-0003). This is the ONLY label the classifier reads — a
 * `project:*` / `work:*` / arbitrary label is never consulted. Returns
 * `undefined` when no valid altitude label is set, so the caller can fall back
 * to structural classification.
 */
export function altitudeFromLabel(beat: Beat): BeatRole | undefined {
  for (const label of beat.labels ?? []) {
    if (!label.startsWith(ALTITUDE_LABEL_PREFIX)) continue;
    const value = label.slice(ALTITUDE_LABEL_PREFIX.length).trim().toLowerCase();
    if (ALTITUDE_VALUES.has(value as BeatRole)) return value as BeatRole;
  }
  return undefined;
}

/**
 * Decide a beat's role: an explicit `altitude:*` label wins (ADR-0003); absent
 * that, fall back to its graph position alone.
 *
 * - no-parent + children  -> project
 * - parent    + children  -> initiative
 * - parent    + no-children -> task
 * - no-parent + no-children -> task (a lone leaf)
 */
export function classifyBeatRole(
  beat: Beat,
  ctx: { hasParentInSet: boolean; hasChildren: boolean },
): BeatRole {
  const explicit = altitudeFromLabel(beat);
  if (explicit) return explicit;
  if (!ctx.hasParentInSet && ctx.hasChildren) return "project";
  if (ctx.hasParentInSet && ctx.hasChildren) return "initiative";
  return "task";
}

function toTaskNode(beat: Beat): TaskNode {
  return { id: beat.id, title: beat.title, beat };
}

function makeUnsorted(id: string): ProjectNode {
  // A synthetic bead so the unsorted bucket has a real `beat` field shape.
  const beat: Beat = {
    id,
    title: "Unsorted",
    type: "work",
    state: "",
    priority: 2,
    labels: [],
    created: "",
    updated: "",
  };
  return { id, title: "Unsorted", beat, initiatives: [], tasks: [] };
}

/**
 * Group a flat `Beat[]` into a Project -> Initiative -> Task tree.
 *
 * A project's direct leaf children go in `project.tasks`; its direct
 * sub-parent children go in `project.initiatives`, and each initiative's own
 * children go in `initiative.tasks`. Deeper descendants stay under their
 * nearest initiative. Tasks whose parent id is absent from the set, and
 * parentless tasks, are routed to the synthetic `unsorted` project.
 */
export function groupIntoProjectTree(
  beats: Beat[],
  opts: GroupIntoProjectTreeOptions = {},
): ProjectTree {
  const unsortedId = opts.unsortedProjectId ?? DEFAULT_UNSORTED_PROJECT_ID;
  const unsorted = makeUnsorted(unsortedId);
  const tree: ProjectTree = { projects: [], unsorted };

  if (beats.length === 0) return tree;

  // Deterministic, cycle-safe ordering + `_hasChildren` from the shared walk.
  const hierarchy = buildHierarchy(beats);
  const byId = new Map<string, Beat>(beats.map((b) => [b.id, b]));
  const meta = new Map<string, HierarchicalBeat>(
    hierarchy.map((h) => [h.id, h]),
  );

  const projectNodes = new Map<string, ProjectNode>();
  const initiativeNodes = new Map<string, InitiativeNode>();

  const hasParentInSet = (beat: Beat): boolean =>
    Boolean(beat.parent && byId.has(beat.parent));
  const hasChildren = (beat: Beat): boolean =>
    meta.get(beat.id)?._hasChildren ?? false;
  const role = (beat: Beat): BeatRole =>
    classifyBeatRole(beat, {
      hasParentInSet: hasParentInSet(beat),
      hasChildren: hasChildren(beat),
    });

  // First pass (DFS order): materialize project and initiative container nodes
  // so a child can always find its parent container regardless of input order.
  for (const h of hierarchy) {
    const beat = byId.get(h.id)!;
    const r = role(beat);
    if (r === "project") {
      projectNodes.set(beat.id, {
        id: beat.id,
        title: beat.title,
        beat,
        initiatives: [],
        tasks: [],
      });
    } else if (r === "initiative") {
      initiativeNodes.set(beat.id, {
        id: beat.id,
        title: beat.title,
        beat,
        tasks: [],
      });
    }
  }

  // Wire projects into the tree in DFS (deterministic) order.
  for (const h of hierarchy) {
    const project = projectNodes.get(h.id);
    if (project) tree.projects.push(project);
  }

  // Second pass: attach initiatives to projects and tasks to their container.
  for (const h of hierarchy) {
    const beat = byId.get(h.id)!;
    const r = role(beat);
    if (r === "project") continue;

    const parentId = beat.parent;
    if (r === "initiative") {
      const parentProject = parentId
        ? projectNodes.get(parentId)
        : undefined;
      const node = initiativeNodes.get(beat.id)!;
      // An initiative whose parent is itself an initiative (deeper nesting)
      // attaches to that initiative's owning project view via its tasks list;
      // here we attach to the nearest project when present, else unsorted.
      if (parentProject) parentProject.initiatives.push(node);
      else attachInitiativeUnderInitiative(node, parentId, initiativeNodes);
      continue;
    }

    // r === "task"
    placeTask(beat, parentId, projectNodes, initiativeNodes, unsorted, byId);
  }

  return tree;
}

/**
 * Attach an initiative that sits under another initiative. We flatten its
 * own subtree by treating it as a task-bearing node of the ancestor
 * initiative; if no ancestor initiative exists it falls through unattached
 * (its tasks are still routed independently by `placeTask`).
 */
function attachInitiativeUnderInitiative(
  node: InitiativeNode,
  parentId: string | undefined,
  initiatives: Map<string, InitiativeNode>,
): void {
  const ancestor = parentId ? initiatives.get(parentId) : undefined;
  if (ancestor) {
    ancestor.tasks.push({ id: node.id, title: node.title, beat: node.beat });
  }
}

function placeTask(
  beat: Beat,
  parentId: string | undefined,
  projects: Map<string, ProjectNode>,
  initiatives: Map<string, InitiativeNode>,
  unsorted: ProjectNode,
  byId: Map<string, Beat>,
): void {
  const node = toTaskNode(beat);

  // Parentless or dangling-parent (absent from set) -> unsorted, never dropped.
  if (!parentId || !byId.has(parentId)) {
    unsorted.tasks.push(node);
    return;
  }

  const initiative = initiatives.get(parentId);
  if (initiative) {
    initiative.tasks.push(node);
    return;
  }

  const project = projects.get(parentId);
  if (project) {
    project.tasks.push(node);
    return;
  }

  // Parent exists in set but is neither a project nor an initiative container
  // (e.g. caught in a cycle so it never surfaced as a container). Keep the
  // task rather than drop it.
  unsorted.tasks.push(node);
}
