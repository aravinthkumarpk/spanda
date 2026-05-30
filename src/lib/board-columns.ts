import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";
import { compareBeatsByPriorityThenUpdated } from "@/lib/beat-sort";
import { isOverviewBeat } from "@/lib/beat-state-overview";

/**
 * board-columns — pure, loom-derived classifier that maps a beat's workflow
 * state into the normalized four-column board (To do / Doing / Review / Done).
 *
 * Classification is driven ENTIRELY by the injected
 * `MemoryWorkflowDescriptor` (terminal / queue / review-queue / action state
 * lists). No state name is ever hardcoded here — see CLAUDE.md "State
 * Classification Is Loom-Derived". The only literals permitted in this module
 * are the four presentation column ids/labels (CLAUDE.md presentation
 * exception 2).
 */

export type BoardColumnId = "todo" | "doing" | "review" | "done";

export interface BoardColumn {
  id: BoardColumnId;
  label: string;
}

/** The four normalized board columns, in canonical left-to-right order. */
export const BOARD_COLUMNS: readonly BoardColumn[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
] as const;

/**
 * Grouped board result. The four column ids always map to an array (possibly
 * empty). `unclassified` is the side channel: beats whose resolved state is in
 * the descriptor but unbucketed, unknown, or blank/null. They are surfaced
 * here so callers can detect and report them — never silently dropped into
 * `todo`.
 */
export type BoardColumnGroups =
  & Record<BoardColumnId, Beat[]>
  & { unclassified: Beat[] };

function normalizeState(
  state: string | null | undefined,
): string | null {
  const normalized = state?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

/**
 * Map a single beat state into a board column using only descriptor fields.
 *
 * Order is LOCKED:
 *   1. terminalStates   -> "done"   (terminal always wins)
 *   2. reviewQueueStates -> "review" (review is a queue subset, checked first)
 *   3. queueStates (not review) -> "todo"
 *   4. actionStates     -> "doing"
 *   5. otherwise        -> null  (never silently bucketed into todo)
 *
 * Input is normalized (trimmed + lowercased); descriptor fields are already
 * lowercased by `toDescriptor`.
 */
export function boardColumnForState(
  state: string | null | undefined,
  descriptor: MemoryWorkflowDescriptor,
): BoardColumnId | null {
  const normalized = normalizeState(state);
  if (normalized === null) return null;

  if ((descriptor.terminalStates ?? []).includes(normalized)) {
    return "done";
  }
  if ((descriptor.reviewQueueStates ?? []).includes(normalized)) {
    return "review";
  }
  if ((descriptor.queueStates ?? []).includes(normalized)) {
    return "todo";
  }
  if ((descriptor.actionStates ?? []).includes(normalized)) {
    return "doing";
  }
  return null;
}

function assertUsableDescriptor(
  descriptor: MemoryWorkflowDescriptor,
  beat: Beat,
): void {
  const hasTerminal = (descriptor.terminalStates ?? []).length > 0;
  const hasQueue = (descriptor.queueStates ?? []).length > 0;
  const hasAction = (descriptor.actionStates ?? []).length > 0;
  if (hasTerminal || hasQueue || hasAction) return;
  throw new Error(
    "FOOLERY BOARD CLASSIFY FAILURE: workflow descriptor "
      + `"${descriptor.id}" resolved for beat "${beat.id}" has empty `
      + "terminalStates, queueStates, AND actionStates (broken/missing "
      + "loom). A board cannot be rendered from an empty workflow. Fix the "
      + "profile so kno reports at least one of terminal_states / "
      + "queue_states / action_states.",
  );
}

function emptyGroups(): BoardColumnGroups {
  return {
    todo: [],
    doing: [],
    review: [],
    done: [],
    unclassified: [],
  };
}

/**
 * Group beats into the four normalized board columns.
 *
 * - Always returns all four column keys plus `unclassified` (empty arrays when
 *   none) so callers never index into `undefined`.
 * - Lease-type beats are excluded via `isOverviewBeat`.
 * - Each column (and the unclassified channel) is ordered with
 *   `compareBeatsByPriorityThenUpdated`.
 * - A beat that classifies to null is surfaced in `unclassified`, never
 *   silently dropped into `todo`.
 * - Throws a FOOLERY-marked error if a resolved descriptor has empty terminal,
 *   queue, AND action state lists (broken loom) rather than rendering an empty
 *   board.
 */
export function groupBeatsByBoardColumn(
  beats: readonly Beat[],
  descriptorFor: (beat: Beat) => MemoryWorkflowDescriptor,
): BoardColumnGroups {
  const groups = emptyGroups();

  for (const beat of beats) {
    if (!isOverviewBeat(beat)) continue;
    const descriptor = descriptorFor(beat);
    assertUsableDescriptor(descriptor, beat);
    const column = boardColumnForState(beat.state, descriptor);
    if (column === null) {
      groups.unclassified.push(beat);
    } else {
      groups[column].push(beat);
    }
  }

  for (const beatList of Object.values(groups)) {
    beatList.sort(compareBeatsByPriorityThenUpdated);
  }

  return groups;
}
