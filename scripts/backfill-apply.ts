// backfill-apply.ts — Epic D command generator. Prints the exact `bd` commands
// to apply the approved backfill plan. With --print (default) it ONLY prints;
// execution is done separately by the orchestrator after review.
//
// Decisions folded in (user-approved 2026-05-30):
//   - agent-studio root = mbu; dc2e + jjhq nest under mbu too
//   - gc4 (Side Projects) nests under w20 + work:do
//   - w9o full fix: + project:agent-studio + parent mbu + work:do
//
// Usage: bun scripts/backfill-apply.ts [path-to-issues.jsonl]

import { readFileSync } from "node:fs";
import {
  planBackfill,
  type BeadSnapshot,
  type ProjectRoot,
} from "../src/lib/beads-backfill-plan";

const JSONL =
  process.argv[2] ?? "/home/deploy/personal-os/.beads/issues.jsonl";
const W9O = "my-personal-os-w9o";
const MBU = "my-personal-os-mbu";

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

const parentOf = new Map<string, string>();
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
const snapshot: BeadSnapshot[] = rows
  .filter((r) => isLive(r.status))
  .map((r) => ({
    id: r.id,
    labels: r.labels ?? [],
    parentId: parentOf.get(r.id) ?? null,
    type: r.issue_type ?? "task",
    hasChildren: isParent.has(r.id),
  }));

// Explicit, unambiguous roots (the 3 project epics that own flat tasks).
const roots: ProjectRoot[] = [
  { id: MBU, project: "project:agent-studio" },
  { id: "my-personal-os-t14", project: "project:ai-transformation" },
  { id: "my-personal-os-w20", project: "project:personal" },
];

const plan = planBackfill(snapshot, roots);

const cmds: string[] = [];
// Reparents (skip w9o — handled by the full-fix line below).
for (const r of plan.reparents) {
  if (r.child === W9O) continue;
  cmds.push(`bd update ${r.child} --parent ${r.parent}`);
}
// Relabels (skip w9o's planner bucket — folded into the full-fix line).
for (const r of plan.relabels) {
  if (r.id === W9O) continue;
  const parts = [
    ...r.add.map((l) => `--add-label ${l}`),
    ...r.remove.map((l) => `--remove-label ${l}`),
  ];
  cmds.push(`bd update ${r.id} ${parts.join(" ")}`);
}
// w9o full fix (decision 3).
cmds.push(
  `bd update ${W9O} --add-label project:agent-studio --add-label work:do ` +
    `--parent ${MBU}`,
);

const out = (s: string) => process.stdout.write(s + "\n");
out("# === EPIC D — APPLY COMMANDS (review before running) ===");
out(`# source: ${JSONL}`);
out(`# reparents: ${plan.reparents.length} (incl. agent-studio under mbu)`);
out(`# relabels:  ${plan.relabels.length}`);
out(`# total bd commands: ${cmds.length}`);
out("");
for (const c of cmds) out(c);
