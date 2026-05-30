/**
 * beads-backfill-plan — pure, idempotent planner (Q9/Q10) that turns a
 * snapshot of the registered beads DB into a dry-run backfill plan.
 *
 * Three jobs, all derived purely from the passed snapshot (no DB access, no
 * executor here, no hardcoded personal-os ids):
 *
 *   1. Reparent still-FLAT tasks (`parentId === null`) under the existing
 *      `project:*` root bead. Already-parented rows are SKIPPED — that is what
 *      makes the planner idempotent (the live data already has 49/79
 *      parented). A flat task whose `project:*` root does NOT exist in `roots`
 *      goes to `projectRootsMissing` so the caller creates a root first — we
 *      NEVER invent a root id (fail loud, no silent guess).
 *
 *   2. Normalize the two spellings of the coordinate bucket: `work:coord` ->
 *      `work:coordinate`. Idempotent: only emitted where `work:coord` is
 *      present; if `work:coordinate` is absent we add it, otherwise we only
 *      remove the stale `work:coord`.
 *
 *   3. Bucket unbucketed LEAF tasks (`hasChildren === false`, no `work:*`
 *      label) by adding `opts.defaultBucket` (default `work:do`). Epic PARENTS
 *      (`hasChildren === true`) are NEVER bucketed — buckets are a leaf
 *      concern (they pick a per-task lifecycle/profile) — they are recorded in
 *      `skipped` instead.
 *
 * Policy decisions (also surfaced in `BackfillPlan.decisions`):
 *   - D1 Idempotency: re-running over a post-applied snapshot yields empty
 *     `reparents` and `relabels`. Every branch is gated on the *needs-change*
 *     condition, never on a blanket rewrite.
 *   - D2 Missing root is loud, not invented: a flat task with a `project:*`
 *     label but no matching root in `roots` is reported, not silently dropped
 *     and not handed a fabricated parent id.
 *   - D3 Multiple `project:*` labels: pick the lexicographically smallest
 *     (sorted ascending) for a deterministic, input-order-independent result,
 *     and note the ambiguity in `skipped` + `decisions`.
 *   - D4 `work:coord` counts as a real (coordinate) bucket, so a row carrying
 *     it is NOT treated as unbucketed — it is relabeled, never bucket-stamped.
 *   - D5 CONFIG fail-loud: an invalid `defaultBucket` (not a `work:*` label)
 *     or duplicate roots for the same project THROW a greppable FOOLERY error
 *     naming the bad value and the valid shape. We never coalesce to a default.
 *
 * Hermetic — no fs, no env, no clock, no RNG, no network. State workflow
 * classification is out of scope here (this operates on label/parent hygiene,
 * not on loom workflow states), so no MemoryWorkflowDescriptor is needed.
 */

/** Namespace prefix for the structural project grouping label. */
const PROJECT_LABEL_PREFIX = "project:";
/** Namespace prefix for bucket labels (the per-task lifecycle hint). */
const BUCKET_LABEL_PREFIX = "work:";
/** The stale coordinate-bucket spelling that must be normalized away. */
const COORD_STALE_LABEL = "work:coord";
/** The canonical coordinate-bucket spelling. */
const COORD_CANONICAL_LABEL = "work:coordinate";
/** Fallback bucket for unbucketed leaves when caller passes no override. */
const DEFAULT_BUCKET = "work:do";

/** A single registered bead, reduced to the fields the planner reasons over. */
export interface BeadSnapshot {
  id: string;
  labels: string[];
  parentId: string | null;
  type: string;
  hasChildren: boolean;
}

/** An existing project-root bead, keyed by its `project:*` label value. */
export interface ProjectRoot {
  id: string;
  project: string;
}

/** A planned parent assignment for one still-flat task. */
export interface Reparent {
  child: string;
  parent: string;
  project: string;
}

/** A planned label mutation (coord normalization and/or bucket stamp). */
export interface Relabel {
  id: string;
  add: string[];
  remove: string[];
}

/** A row the planner deliberately left untouched, with a human reason. */
export interface SkippedBead {
  id: string;
  reason: string;
}

/** Reconcilable totals for the dry-run summary. */
export interface BackfillSummary {
  totalBeads: number;
  alreadyParented: number;
  toReparent: number;
  rootsMissing: number;
  coordRelabels: number;
  bucketed: number;
  skipped: number;
}

/** The complete dry-run plan returned by {@link planBackfill}. */
export interface BackfillPlan {
  reparents: Reparent[];
  projectRootsMissing: string[];
  relabels: Relabel[];
  skipped: SkippedBead[];
  summary: BackfillSummary;
  decisions: string[];
}

/** Options for the planner. `defaultBucket` must be a `work:*` label. */
export interface BackfillOptions {
  defaultBucket?: string;
}

/** Project labels carried by a bead, sorted ascending for determinism. */
function projectLabelsOf(bead: BeadSnapshot): string[] {
  return bead.labels
    .filter((l) => l.startsWith(PROJECT_LABEL_PREFIX))
    .sort();
}

/** True if the bead already carries any `work:*` bucket label. */
function hasBucket(bead: BeadSnapshot): boolean {
  return bead.labels.some((l) => l.startsWith(BUCKET_LABEL_PREFIX));
}

/**
 * Build the project -> root-id map, failing loud on duplicate roots for the
 * same project (CONFIG fail-loud: an ambiguous root would make reparenting
 * non-deterministic and is a real config bug, never coalesced).
 */
function buildRootMap(roots: ProjectRoot[]): Map<string, string> {
  const byProject = new Map<string, string>();
  for (const root of roots) {
    const existing = byProject.get(root.project);
    if (existing && existing !== root.id) {
      throw new Error(
        `FOOLERY BACKFILL CONFIG: two project roots claim "${root.project}" ` +
          `(ids "${existing}" and "${root.id}") — exactly one root bead per ` +
          "project:* value is required",
      );
    }
    byProject.set(root.project, root.id);
  }
  return byProject;
}

/** Validate the bucket option, failing loud if it is not a `work:*` label. */
function resolveDefaultBucket(opts?: BackfillOptions): string {
  if (opts?.defaultBucket === undefined) return DEFAULT_BUCKET;
  const bucket = opts.defaultBucket;
  if (!bucket.startsWith(BUCKET_LABEL_PREFIX) || bucket === BUCKET_LABEL_PREFIX) {
    throw new Error(
      `FOOLERY BACKFILL CONFIG: defaultBucket "${bucket}" is not a valid ` +
        `bucket label — it must start with "${BUCKET_LABEL_PREFIX}" and ` +
        'name a bucket (e.g. "work:do", "work:coordinate", "work:followup")',
    );
  }
  return bucket;
}

interface Accumulator {
  reparents: Reparent[];
  projectRootsMissing: Set<string>;
  relabels: Relabel[];
  skipped: SkippedBead[];
  alreadyParented: number;
  bucketed: number;
  coordRelabels: number;
}

/** Plan the reparent for one bead; mutates the accumulator. */
function planReparent(
  bead: BeadSnapshot,
  rootMap: Map<string, string>,
  acc: Accumulator,
): void {
  if (bead.parentId !== null) {
    acc.alreadyParented += 1;
    acc.skipped.push({ id: bead.id, reason: "already parented" });
    return;
  }
  const projects = projectLabelsOf(bead);
  if (projects.length === 0) {
    acc.skipped.push({
      id: bead.id,
      reason: "flat task with no project:* label — cannot reparent",
    });
    return;
  }
  const project = projects[0];
  if (projects.length > 1) {
    acc.skipped.push({
      id: bead.id,
      reason:
        `multiple project:* labels [${projects.join(", ")}] — picked ` +
        `"${project}" (lexicographically smallest, deterministic)`,
    });
  }
  const parent = rootMap.get(project);
  if (!parent) {
    acc.projectRootsMissing.add(project);
    return;
  }
  if (parent === bead.id) {
    // This bead IS the project root for its own project label (e.g. the
    // ai-transformation epic carrying project:ai-transformation). It cannot
    // be its own parent — leave it at the top of the hierarchy.
    acc.skipped.push({
      id: bead.id,
      reason: `is the project root for ${project} — cannot be its own parent`,
    });
    return;
  }
  acc.reparents.push({ child: bead.id, parent, project });
}

/** Compute the coord-normalization + bucket-stamp label mutation for a bead. */
function planRelabel(
  bead: BeadSnapshot,
  defaultBucket: string,
  acc: Accumulator,
): void {
  const add: string[] = [];
  const remove: string[] = [];

  const hasStaleCoord = bead.labels.includes(COORD_STALE_LABEL);
  if (hasStaleCoord) {
    remove.push(COORD_STALE_LABEL);
    if (!bead.labels.includes(COORD_CANONICAL_LABEL)) {
      add.push(COORD_CANONICAL_LABEL);
    }
    acc.coordRelabels += 1;
  }

  if (!hasBucket(bead)) {
    if (bead.hasChildren) {
      acc.skipped.push({
        id: bead.id,
        reason: "parent, buckets are a leaf concern",
      });
    } else {
      add.push(defaultBucket);
      acc.bucketed += 1;
    }
  }

  if (add.length > 0 || remove.length > 0) {
    acc.relabels.push({ id: bead.id, add, remove });
  }
}

const DECISIONS: string[] = [
  "Idempotent: already-parented rows skipped; relabels gated on " +
    "needs-change, so a post-applied snapshot plans no further work.",
  "Missing project root is reported in projectRootsMissing, never " +
    "invented — caller must create the root bead first.",
  "Multiple project:* labels resolve to the lexicographically smallest " +
    "(deterministic, input-order-independent); ambiguity noted in skipped.",
  "work:coord is a real coordinate bucket: rows carrying it are relabeled " +
    "to work:coordinate and never bucket-stamped.",
  "Epic parents (hasChildren) are never bucketed — buckets are a leaf " +
    "concern (they pick a per-task lifecycle).",
  "CONFIG fail-loud: invalid defaultBucket or duplicate project roots throw " +
    "a FOOLERY error rather than coalescing to a default.",
];

/**
 * Plan the idempotent beads backfill from a DB snapshot. Pure: returns a new
 * plan; mutates nothing. See the module header for the full policy set.
 */
export function planBackfill(
  beads: BeadSnapshot[],
  roots: ProjectRoot[],
  opts?: BackfillOptions,
): BackfillPlan {
  const rootMap = buildRootMap(roots);
  const defaultBucket = resolveDefaultBucket(opts);

  const acc: Accumulator = {
    reparents: [],
    projectRootsMissing: new Set<string>(),
    relabels: [],
    skipped: [],
    alreadyParented: 0,
    bucketed: 0,
    coordRelabels: 0,
  };

  for (const bead of beads) {
    planReparent(bead, rootMap, acc);
    planRelabel(bead, defaultBucket, acc);
  }

  const projectRootsMissing = [...acc.projectRootsMissing].sort();

  return {
    reparents: acc.reparents,
    projectRootsMissing,
    relabels: acc.relabels,
    skipped: acc.skipped,
    summary: {
      totalBeads: beads.length,
      alreadyParented: acc.alreadyParented,
      toReparent: acc.reparents.length,
      rootsMissing: projectRootsMissing.length,
      coordRelabels: acc.coordRelabels,
      bucketed: acc.bucketed,
      skipped: acc.skipped.length,
    },
    decisions: DECISIONS,
  };
}
