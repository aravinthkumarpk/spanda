import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";

const DAY_MS = 86_400_000;

/**
 * Hide stale completed work from the UI: drop any beat that is terminal
 * (its state is in the loom-derived `descriptor.terminalStates`) AND was
 * completed more than `days` ago. Recently-completed beats (within the window)
 * still show, and non-terminal beats always show.
 *
 * "Completed at" is `beat.closed` (the close timestamp) when present, else
 * `beat.updated`. A terminal beat with an unparseable/missing timestamp is
 * KEPT (fail-soft — never hide something whose age we can't determine).
 *
 * Because a closed PARENT (a finished project) is itself terminal, this also
 * removes long-done projects from the Projects rollup — not just leaf tasks.
 *
 * Pure + hermetic: `now` and the descriptor resolver are injected.
 */
export function hideStaleCompleted(
  beats: readonly Beat[],
  now: number,
  resolveDescriptor: (beat: Beat) => MemoryWorkflowDescriptor,
  days = 7,
): Beat[] {
  const cutoffMs = days * DAY_MS;
  return beats.filter((beat) => {
    const descriptor = resolveDescriptor(beat);
    const state = beat.state?.trim().toLowerCase() ?? "";
    const isTerminal = (descriptor.terminalStates ?? []).includes(state);
    if (!isTerminal) return true;
    const stamp = beat.closed ?? beat.updated;
    const completedMs = stamp ? Date.parse(stamp) : Number.NaN;
    if (Number.isNaN(completedMs)) return true;
    return now - completedMs <= cutoffMs;
  });
}
