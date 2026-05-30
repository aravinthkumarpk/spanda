import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";
import { type BoardColumnId, boardColumnForState } from "@/lib/board-columns";

/**
 * board-drag-target — pure resolver for "what state does this beat move to when
 * I drop it in this column?" (iteration 02, A2).
 *
 * The board is normalized to four columns, but a beat carries a specific
 * loom-derived state. Dropping a card therefore can't just "set the column" —
 * it has to pick the real state that (a) lives in the target column and (b) is
 * reachable from the beat's current state by a transition the workflow already
 * declares. That keeps drag-and-drop honest: it only ever performs moves kno
 * would accept without `--force`. A drop that would need an illegal jump (e.g.
 * To do → Done in one grab) resolves to `null` and the UI rejects it, rather
 * than fabricating a transition.
 *
 * No state name is hardcoded here — the column of every candidate state is read
 * back through `boardColumnForState`, which is itself descriptor-driven
 * (CLAUDE.md "State Classification Is Loom-Derived").
 */

export interface DropResolution {
  /** The concrete state to PATCH the beat to. */
  targetState: string;
  /** The target column is Done — a terminal move, so confirm before applying. */
  isTerminal: boolean;
}

function normalize(state: string | null | undefined): string | null {
  const s = state?.trim().toLowerCase();
  return s && s.length > 0 ? s : null;
}

/**
 * States reachable from `from` by one EXPLICIT declared transition. The `*`
 * wildcard rules (defer / abandon escape hatches, available from any state) are
 * deliberately excluded: dragging a card forward should never silently abandon
 * or defer it — those are explicit menu actions, not drop targets.
 */
function nextStates(
  from: string,
  descriptor: MemoryWorkflowDescriptor,
): string[] {
  const out: string[] = [];
  for (const t of descriptor.transitions ?? []) {
    if (t.from === from && t.to !== from && !out.includes(t.to)) {
      out.push(t.to);
    }
  }
  return out;
}

/**
 * Resolve the drop. Returns `null` when the move is a no-op (already in the
 * target column) or impossible in one declared step (so the caller reverts the
 * optimistic UI). Candidate ordering follows the descriptor's transition order,
 * so the canonical forward move is preferred.
 */
export function resolveDropTarget(
  beat: Beat,
  targetColumn: BoardColumnId,
  descriptor: MemoryWorkflowDescriptor,
): DropResolution | null {
  const current = normalize(beat.state);
  if (current === null) return null;

  // Already where it was dropped → nothing to do.
  if (boardColumnForState(current, descriptor) === targetColumn) return null;

  for (const candidate of nextStates(current, descriptor)) {
    if (boardColumnForState(candidate, descriptor) === targetColumn) {
      return { targetState: candidate, isTerminal: targetColumn === "done" };
    }
  }
  return null;
}
