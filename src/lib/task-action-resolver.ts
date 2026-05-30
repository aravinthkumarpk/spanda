import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";

/**
 * task-action-resolver — pure, loom-derived resolver for the Complete/terminal
 * decision on a task beat.
 *
 * This replaces the legacy hardcoded `["shipped", "abandoned", "closed"]`
 * literal sets that violated CLAUDE.md "State Classification Is Loom-Derived".
 * ALL classification flows from the injected `MemoryWorkflowDescriptor`
 * (`terminalStates` / `finalCutState`); no state name is ever hardcoded here.
 *
 * `descriptor === undefined` means classification is UNKNOWN: the caller cannot
 * tell whether a beat is terminal, so neither terminal nor completable is
 * asserted (no hardcoded default is invented — CLAUDE.md "Fail Loudly, Never
 * Silently"). Matching is case-insensitive and whitespace-trimmed on both sides.
 */

/** Result of resolving the Complete/terminal decision for a single beat. */
export interface TaskActionResolution {
  /** True when the beat's state is one of the descriptor's terminalStates. */
  isTerminal: boolean;
  /** True when a non-terminal beat can be driven to a terminal state. */
  canComplete: boolean;
  /**
   * The descriptor state a Complete action should move the beat into, with the
   * descriptor's original casing preserved. `null` when the beat is already
   * terminal, when no terminal set exists, or when classification is unknown.
   */
  completeTargetState: string | null;
}

function normalize(state: string | null | undefined): string | null {
  const trimmed = state?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Membership test for the descriptor's terminalStates, case-insensitive on
 * both sides. An undefined descriptor yields `false` (classification unknown);
 * an empty/undefined terminal set yields `false`.
 */
export function isTerminalState(
  state: string,
  descriptor: MemoryWorkflowDescriptor | undefined,
): boolean {
  if (descriptor === undefined) return false;
  const normalized = normalize(state);
  if (normalized === null) return false;
  const terminals = descriptor.terminalStates ?? [];
  return terminals.some((t) => normalize(t) === normalized);
}

/**
 * Pick the descriptor state that a Complete action targets, preserving the
 * descriptor's original casing. Prefers `finalCutState` (the "done" terminal)
 * so an abandon-style terminal is never chosen when a real completion terminal
 * exists. Falls back to the first terminal. Returns `null` when no terminal
 * exists — NEVER invents a literal such as "shipped".
 */
function resolveCompleteTarget(
  descriptor: MemoryWorkflowDescriptor,
): string | null {
  const terminals = descriptor.terminalStates ?? [];
  if (terminals.length === 0) return null;

  const finalCut = descriptor.finalCutState;
  if (finalCut !== null && finalCut !== undefined) {
    const finalNormalized = normalize(finalCut);
    if (finalNormalized !== null) {
      const match = terminals.find((t) => normalize(t) === finalNormalized);
      // Prefer the descriptor's terminalStates entry so the returned value is
      // guaranteed to be a real target; fall back to finalCutState verbatim.
      return match ?? finalCut;
    }
  }
  return terminals[0] ?? null;
}

/**
 * Resolve the Complete/terminal decision for a beat from its descriptor.
 *
 * Rules (LOCKED):
 *   - beat.state in terminalStates -> isTerminal=true, canComplete=false,
 *     completeTargetState=null.
 *   - non-terminal with a non-empty terminal set -> isTerminal=false,
 *     canComplete=true, completeTargetState = finalCutState (preferred) else
 *     first terminal.
 *   - terminalStates empty/undefined -> canComplete=false, target=null.
 *   - descriptor undefined -> isTerminal=false AND canComplete=false (cannot
 *     classify; no hardcoded default).
 */
export function resolveTaskActions(
  beat: Pick<
    Beat,
    "state" | "profileId" | "nextActionOwnerKind" | "isAgentClaimable"
  >,
  descriptor: MemoryWorkflowDescriptor | undefined,
): TaskActionResolution {
  if (descriptor === undefined) {
    return {
      isTerminal: false,
      canComplete: false,
      completeTargetState: null,
    };
  }

  if (isTerminalState(beat.state, descriptor)) {
    return {
      isTerminal: true,
      canComplete: false,
      completeTargetState: null,
    };
  }

  const target = resolveCompleteTarget(descriptor);
  return {
    isTerminal: false,
    canComplete: target !== null,
    completeTargetState: target,
  };
}
