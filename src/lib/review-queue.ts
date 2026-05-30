import type { Beat } from "@/lib/types";

/**
 * review-queue — the human-gate queue (ADR-0004, D5). The "Review" surface
 * lists exactly the beats waiting on the human's decision: those resting at a
 * gate whose next action is human-owned (`plan_review` / `implementation_review`
 * in the `do` lifecycle). That's precisely what the loom-derived
 * `requiresHumanAction` flag captures, so this is a one-line filter rather than
 * any state-name matching. Pure; order-preserving.
 */
export function gateBeats(beats: readonly Beat[]): Beat[] {
  return beats.filter((b) => b.requiresHumanAction === true);
}
