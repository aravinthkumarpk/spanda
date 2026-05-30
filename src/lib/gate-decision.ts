import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";
import { isRollbackTransition } from "@/lib/workflows";

/**
 * gate-decision — derive the Approve / Reject targets for a beat resting at a
 * human gate (ADR-0004, D6). A gate is a branch: Approve advances past it
 * (the forward transition), Reject sends it back (the rollback transition).
 *
 * A beat rests at a queue state (`ready_for_plan_review` /
 * `ready_for_implementation_review`); the human performs the review *action*
 * (`plan_review` / `implementation_review`) whose two outcomes are the
 * forward/rollback targets. We resolve the action, then read its transitions:
 * the non-rollback one is Approve, the rollback one is Reject. Loom-derived —
 * no state name is hardcoded. The defer/abandon escape hatches are excluded.
 */
export interface GateDecisionTargets {
  /** Forward target — advances the initiative past the gate. */
  approve?: string;
  /** Rollback target — sends it back (carries the reject note). */
  reject?: string;
}

function reviewActionFor(
  current: string,
  descriptor: MemoryWorkflowDescriptor,
): string | undefined {
  const actions = descriptor.actionStates ?? [];
  // A gate is a HUMAN-owned review action — an agent action (planning,
  // implementation, sign_off) is not a gate, so it has no Approve/Reject.
  const isGate = (s: string) =>
    actions.includes(s) && descriptor.owners?.[s] === "human";
  if (isGate(current)) return current;
  // The single human review action the resting queue state feeds into.
  for (const t of descriptor.transitions ?? []) {
    if (t.from === current && isGate(t.to)) return t.to;
  }
  return undefined;
}

export function gateDecisionTargets(
  beat: Beat,
  descriptor: MemoryWorkflowDescriptor,
): GateDecisionTargets {
  const current = beat.state?.trim().toLowerCase();
  if (!current) return {};
  const action = reviewActionFor(current, descriptor);
  if (!action) return {};

  const out: GateDecisionTargets = {};
  for (const t of descriptor.transitions ?? []) {
    if (t.from !== action || t.to === action) continue;
    if (t.to === "deferred" || t.to === "abandoned") continue;
    if (isRollbackTransition(action, t.to)) out.reject ??= t.to;
    else out.approve ??= t.to;
  }
  return out;
}
