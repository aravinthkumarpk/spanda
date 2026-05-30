/**
 * project-health — pure, activity-based health for a parent's children (Q7).
 *
 * Adds zero new beat fields: health is derived entirely from existing
 * `state` + `updated` + `nextActionOwnerKind`, plus the loom-derived
 * `MemoryWorkflowDescriptor` for each child (injected via
 * `resolveDescriptor`, never hardcoded).
 *
 * States produced:
 *   - 'empty'   no children at all (explicitly distinct from 'done').
 *   - 'done'    EVERY child is terminal (per its descriptor.terminalStates).
 *   - 'moving'  at least one NON-terminal child moved recently
 *               (isStale(child.updated, now, N) === false).
 *   - 'stalled' no recent movement AND >= 1 open child is actionable.
 *   - 'blocked' open children exist, none moving, none actionable.
 *
 * Precedence: Done > Moving > (Blocked vs Stalled, decided by actionability).
 *
 * `actionable` (loom-derived) = non-terminal AND
 *   (descriptor.actionStates includes the state, OR
 *    descriptor.queueStates includes the state AND
 *    child.nextActionOwnerKind !== 'none').
 *
 * Fail-soft applies only to DATA (a malformed `updated` is treated as old,
 * i.e. not moving). CONFIG never fails soft: a throwing `resolveDescriptor`
 * propagates rather than defaulting.
 *
 * Hermetic: `now` is injected as a number; this module never reads the clock.
 */

import { isStale, staleAgeDays } from "@/lib/stale";
import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";

export type ProjectHealth =
  | "empty"
  | "moving"
  | "stalled"
  | "blocked"
  | "done";

/** Resolves the loom-derived descriptor that classifies a given beat's state. */
export type ResolveDescriptor = (beat: Beat) => MemoryWorkflowDescriptor;

function isTerminal(beat: Beat, descriptor: MemoryWorkflowDescriptor): boolean {
  return descriptor.terminalStates.includes(beat.state);
}

/**
 * Whether a beat shows recent movement within `thresholdDays`.
 *
 * Equivalent to `isStale(...) === false` from the shipped rule, EXCEPT the
 * one place the two diverge by design: the stale badge treats a malformed
 * timestamp as "not stale" (recent), but project health treats a malformed
 * timestamp as NOT moving (old). So we first reject unparseable timestamps
 * via `staleAgeDays`, then defer to the shipped `isStale` boundary.
 */
function movedRecently(
  beat: Beat,
  now: number,
  thresholdDays?: number,
): boolean {
  if (staleAgeDays(beat.updated, now) === null) return false;
  return !isStale(beat.updated, now, thresholdDays);
}

/**
 * Whether an open (non-terminal) beat is actionable, purely from the
 * loom-derived descriptor. Never classifies by hardcoded state name.
 */
function isActionable(
  beat: Beat,
  descriptor: MemoryWorkflowDescriptor,
): boolean {
  if (descriptor.actionStates?.includes(beat.state)) return true;
  if (
    descriptor.queueStates?.includes(beat.state) &&
    beat.nextActionOwnerKind !== "none"
  ) {
    return true;
  }
  return false;
}

/**
 * Classify a parent's portfolio health from its children's real activity.
 *
 * @param children     direct child beats of the project/initiative.
 * @param now          current time in ms (injected; never read internally).
 * @param resolveDescriptor  loom-derived descriptor for a given child.
 * @param thresholdDays  movement window in days (default 7); reuses the
 *                       shipped stale rule via `isStale`.
 */
export function classifyProjectHealth(
  children: Beat[],
  now: number,
  resolveDescriptor: ResolveDescriptor,
  thresholdDays?: number,
): ProjectHealth {
  if (children.length === 0) return "empty";

  let allTerminal = true;
  let anyMoving = false;
  let anyActionable = false;

  for (const child of children) {
    const descriptor = resolveDescriptor(child);
    if (isTerminal(child, descriptor)) continue;

    allTerminal = false;
    if (movedRecently(child, now, thresholdDays)) anyMoving = true;
    if (isActionable(child, descriptor)) anyActionable = true;
  }

  if (allTerminal) return "done";
  if (anyMoving) return "moving";
  return anyActionable ? "stalled" : "blocked";
}
