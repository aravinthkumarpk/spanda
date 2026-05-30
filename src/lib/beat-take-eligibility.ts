import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";
import { isTerminalState } from "@/lib/task-action-resolver";

export type TakeEligibleBeat = Pick<
  Beat,
  "state" | "type" | "nextActionOwnerKind" | "isAgentClaimable"
>;

/**
 * Whether a beat can be handed to an agent (the Q4 owner-derived "Run" path).
 *
 * Terminal classification is loom-derived: it asks the supplied
 * `MemoryWorkflowDescriptor` (`descriptor.terminalStates`) rather than testing
 * the state string against a hardcoded `shipped/abandoned/closed` set — which
 * silently misclassified every custom-loom profile (whose terminals are e.g.
 * `done`/`cancelled`/`executed`). Callers resolve the descriptor for the beat's
 * profile (`builtinProfileDescriptor(beat.profileId)` / the live workflow list)
 * and plumb it through, per CLAUDE.md "State Classification Is Loom-Derived".
 */
export function canTakeBeat(
  beat: TakeEligibleBeat,
  descriptor: MemoryWorkflowDescriptor | undefined,
): boolean {
  if (isTerminalState(beat.state, descriptor)) return false;
  if (beat.nextActionOwnerKind === "human") return false;
  return beat.isAgentClaimable !== false;
}
