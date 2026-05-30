"use client";

import { useMemo } from "react";
import type { Beat } from "@/lib/types";
import { gateBeats } from "@/lib/review-queue";
import { BeatStateBadge } from "@/components/beat-state-badge";
import { Badge } from "@/components/ui/badge";

/**
 * Review queue (ADR-0004, D5) — the initiatives waiting on YOUR decision: the
 * Plan-review and Execution-review gates. It's a focused list, not the board:
 * a glance at "what needs me", each row opening the initiative's status page
 * where the Approve / Reject controls live (D6/D8). Pure view over the beats
 * already loaded; the gate set is the loom-derived requiresHumanAction flag.
 */
export function ReviewQueueView({
  isLoading,
  loadError,
  beats,
  onOpenBeat,
}: {
  isLoading: boolean;
  loadError: string | null;
  beats: Beat[];
  onOpenBeat: (beat: Beat) => void;
}) {
  const gates = useMemo(() => gateBeats(beats), [beats]);

  if (loadError) {
    return (
      <div className="rounded-2xl bg-paper-50 p-8 text-center text-ink-700">
        {loadError}
      </div>
    );
  }
  if (!isLoading && gates.length === 0) {
    return (
      <div className="rounded-2xl bg-paper-50 p-8 text-center text-ink-700 dark:bg-walnut-100/40">
        Nothing needs your review. When an initiative reaches Plan review or
        Execution review, it shows up here.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {gates.map((beat) => (
        <li key={beat.id}>
          <button
            type="button"
            onClick={() => onOpenBeat(beat)}
            className={
              "flex w-full items-center justify-between gap-3 rounded-xl border"
              + " border-paper-200 bg-paper-50 px-4 py-3 text-left"
              + " transition-colors hover:border-clay-300"
              + " dark:border-walnut-100 dark:bg-walnut-100/40"
            }
          >
            <span className="truncate text-sm font-medium text-ink-900 dark:text-paper-100">
              {beat.title}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge
                variant="outline"
                className="bg-clay-100 text-clay-700 dark:bg-clay-700 dark:text-clay-100"
              >
                ✋ Needs you
              </Badge>
              <BeatStateBadge state={beat.state} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
