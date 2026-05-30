/**
 * project-scope-filter — scope a flat `Beat[]` to one project's subtree
 * (iteration 02, A3). Clicking a project on the Projects view opens the Board
 * filtered to "everything under this project": the project beat itself plus all
 * of its descendants (initiatives and their tasks), to any depth, following
 * native `parent` edges.
 *
 * Pure and cycle-safe: a `parent` cycle can't make it loop or duplicate, and a
 * beat whose parent is absent from the set is simply not pulled in. Input order
 * is preserved in the output.
 */

import type { Beat } from "@/lib/types";

/**
 * Return the project beat plus every beat reachable from it through child
 * (`parent`) edges. If `projectId` isn't in the set, returns `[]` (nothing to
 * scope to) rather than the whole board — a scope that resolves to nothing is
 * better than a scope that silently shows everything.
 */
export function filterToProjectDescendants(
  beats: readonly Beat[],
  projectId: string,
): Beat[] {
  const byParent = new Map<string, Beat[]>();
  for (const beat of beats) {
    if (!beat.parent) continue;
    const siblings = byParent.get(beat.parent);
    if (siblings) siblings.push(beat);
    else byParent.set(beat.parent, [beat]);
  }

  const root = beats.find((b) => b.id === projectId);
  if (!root) return [];

  const inScope = new Set<string>([projectId]);
  const queue: string[] = [projectId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of byParent.get(id) ?? []) {
      if (inScope.has(child.id)) continue; // cycle guard
      inScope.add(child.id);
      queue.push(child.id);
    }
  }

  // Preserve input order; the root is included via the set.
  return beats.filter((b) => inScope.has(b.id));
}
