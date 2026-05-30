"use client";

import type { Beat } from "@/lib/types";
import { BeatStateBadge } from "@/components/beat-state-badge";
import { bucketCardLabel } from "@/lib/bucket-profile";
import { canTakeBeat } from "@/lib/beat-take-eligibility";
import { builtinProfileDescriptor } from "@/lib/workflows";
import { displayBeatLabel } from "@/lib/beat-display";
import { Clapperboard } from "lucide-react";

/**
 * A single card on the normalized board. Shows the beat title, the REAL
 * workflow state as a small badge (Q3: the card keeps the specific state even
 * though the column is normalized), the bucket chip (Q3: bucket = a card label,
 * not a column), and the owner-derived primary action (Q4: a "Run" affordance
 * only when the beat is agent-claimable, via the loom-derived canTakeBeat).
 */
export function BoardCard({
  beat,
  onOpenBeat,
  onShipBeat,
  isShipping,
}: {
  beat: Beat;
  onOpenBeat: (beat: Beat) => void;
  onShipBeat?: (beat: Beat) => void;
  isShipping?: boolean;
}) {
  const descriptor = builtinProfileDescriptor(beat.profileId);
  const bucket = bucketCardLabel(beat.labels);
  const canRun = Boolean(onShipBeat) && canTakeBeat(beat, descriptor);
  return (
    <div
      className={
        "rounded-lg border border-paper-200 bg-paper-50 p-3"
        + " shadow-sm transition-colors hover:border-lake-300"
        + " dark:border-walnut-100 dark:bg-walnut-100/40"
      }
    >
      <button
        type="button"
        onClick={() => onOpenBeat(beat)}
        title={beat.title}
        className={
          "block w-full text-left text-sm font-medium leading-snug"
          + " text-ink-900 hover:text-lake-700 dark:text-paper-100"
        }
      >
        <span className="line-clamp-3">{beat.title}</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <BeatStateBadge state={beat.state} />
        {bucket && (
          <span
            className={
              "rounded-full border border-paper-200 px-1.5 py-0.5"
              + " text-[10px] font-semibold uppercase tracking-wide"
              + " text-ink-500 dark:border-walnut-100 dark:text-paper-400"
            }
          >
            {bucket}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] text-ink-500">
          {displayBeatLabel(beat.id, beat.aliases)}
        </span>
        {canRun && (
          <button
            type="button"
            onClick={() => onShipBeat?.(beat)}
            disabled={isShipping}
            title="Run — hand this task to an agent"
            className={
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5"
              + " text-xs font-medium text-lake-700 hover:bg-lake-100"
              + " disabled:opacity-50 dark:text-lake-100"
              + " dark:hover:bg-lake-700/30"
            }
          >
            <Clapperboard className="size-3" />
            {isShipping ? "Running…" : "Run"}
          </button>
        )}
      </div>
    </div>
  );
}
