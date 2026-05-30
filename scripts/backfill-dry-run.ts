// backfill-dry-run.ts — Epic D dry-run. READ-ONLY.
//
// Reads the registered work DB's export (issues.jsonl) WITHOUT mutating it,
// builds the snapshot the tested pure planner consumes, and prints the
// proposed backfill plan (reparents + label hygiene) for human review.
//
// This script NEVER writes to the beads DB. Applying the plan is a separate,
// explicitly-approved step (use `bd update --parent` / `bd ... --add-label`).
//
// Usage: bun scripts/backfill-dry-run.ts [path-to-issues.jsonl]

import { readFileSync } from "node:fs";
import {
  planBackfill,
  type BeadSnapshot,
  type ProjectRoot,
} from "../src/lib/beads-backfill-plan";

const JSONL =
  process.argv[2] ?? "/home/deploy/personal-os/.beads/issues.jsonl";

interface RawDep {
  issue_id?: string;
  depends_on_id?: string;
  type?: string;
}
interface RawIssue {
  id: string;
  labels: string[] | null;
  status: string;
  issue_type?: string;
  dependencies?: RawDep[];
}

const rows: RawIssue[] = readFileSync(JSONL, "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line) as RawIssue);

// Parent of each id (from this row's own parent-child dep pointing up).
const parentOf = new Map<string, string>();
// Ids that are a parent of at least one row (across ALL statuses).
const isParent = new Set<string>();
for (const row of rows) {
  for (const dep of row.dependencies ?? []) {
    if (dep.type !== "parent-child") continue;
    if (dep.issue_id === row.id && dep.depends_on_id) {
      parentOf.set(row.id, dep.depends_on_id);
    }
    if (dep.depends_on_id) isParent.add(dep.depends_on_id);
  }
}

const isLive = (s: string) => s === "open" || s === "in_progress";
const live = rows.filter((r) => isLive(r.status));

const snapshot: BeadSnapshot[] = live.map((r) => ({
  id: r.id,
  labels: r.labels ?? [],
  parentId: parentOf.get(r.id) ?? null,
  type: r.issue_type ?? "task",
  hasChildren: isParent.has(r.id),
}));

// Candidate project roots: top-level (no parent) parents carrying a project:*
// label. Detect duplicate roots per project and exclude the ambiguous ones so
// the planner does not throw — those projects' flat tasks fall to
// projectRootsMissing for an explicit human decision.
const rootsByProject = new Map<string, string[]>();
for (const bead of snapshot) {
  if (bead.parentId !== null || !bead.hasChildren) continue;
  for (const label of bead.labels) {
    if (!label.startsWith("project:")) continue;
    // The planner keys roots by the FULL "project:*" label value.
    const ids = rootsByProject.get(label) ?? [];
    if (!ids.includes(bead.id)) ids.push(bead.id);
    rootsByProject.set(label, ids);
  }
}
const roots: ProjectRoot[] = [];
const ambiguous: Array<{ project: string; ids: string[] }> = [];
for (const [project, ids] of rootsByProject) {
  if (ids.length === 1) roots.push({ id: ids[0], project });
  else ambiguous.push({ project, ids });
}

const plan = planBackfill(snapshot, roots);

const line = (s: string) => process.stdout.write(s + "\n");
line("=== EPIC D — BACKFILL DRY-RUN (read-only, no writes) ===");
line(`source: ${JSONL}`);
line(`live beads (open + in_progress): ${snapshot.length}`);
line("");
line("-- summary --");
for (const [k, v] of Object.entries(plan.summary)) line(`  ${k}: ${v}`);
line("");
line(`-- project roots resolved (${roots.length}) --`);
for (const r of roots) line(`  ${r.project} -> ${r.id}`);
if (ambiguous.length > 0) {
  line("");
  line(`-- AMBIGUOUS roots (need your decision; tasks fall to missing) --`);
  for (const a of ambiguous) line(`  ${a.project}: ${a.ids.join(", ")}`);
}
line("");
line(`-- reparents (${plan.reparents.length}) --`);
for (const r of plan.reparents) {
  line(`  ${r.child}  ->  ${r.parent}   [${r.project}]`);
}
line("");
line(`-- project roots MISSING (flat tasks with no usable root) --`);
const missingCounts = new Map<string, number>();
for (const bead of snapshot) {
  if (bead.parentId !== null) continue;
  const projects = bead.labels.filter((l) => l.startsWith("project:"));
  const hasRoot = roots.some((r) => projects.includes(r.project));
  if (!hasRoot && !bead.hasChildren) {
    const key = projects.join(",") || "(none)";
    missingCounts.set(key, (missingCounts.get(key) ?? 0) + 1);
  }
}
for (const [k, v] of missingCounts) line(`  ${k}: ${v} flat task(s)`);
line(`  planner.projectRootsMissing: ${plan.projectRootsMissing.join(", ") || "(none)"}`);
line("");
line(`-- relabels (${plan.relabels.length}) --`);
for (const r of plan.relabels) {
  const parts: string[] = [];
  if (r.add.length) parts.push(`+${r.add.join(" +")}`);
  if (r.remove.length) parts.push(`-${r.remove.join(" -")}`);
  line(`  ${r.id}  ${parts.join("  ")}`);
}
line("");
line(`-- skipped (${plan.skipped.length}) --`);
for (const s of plan.skipped.slice(0, 12)) line(`  ${s.id}: ${s.reason}`);
if (plan.skipped.length > 12) line(`  … +${plan.skipped.length - 12} more`);
line("");
line("-- planner decisions --");
for (const d of plan.decisions) line(`  • ${d}`);
line("");
line("NO WRITES PERFORMED. Apply only after explicit approval.");
