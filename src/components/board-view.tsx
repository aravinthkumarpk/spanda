"use client";

import { useMemo } from "react";
import type { Beat } from "@/lib/types";
import {
  BOARD_COLUMNS,
  groupBeatsByBoardColumn,
  type BoardColumnGroups,
} from "@/lib/board-columns";
import { builtinProfileDescriptor } from "@/lib/workflows";
import { BoardCard } from "@/components/board-card";

/**
 * The normalized 4-column board (Q3). Every beat's loom-derived state is
 * classified into To do / Doing / Review / Done by board-columns.ts
 * (queueStates -> To do, actionStates -> Doing, reviewQueueStates -> Review,
 * terminalStates -> Done). No state name is hardcoded here. Beats that resolve
 * to no column are surfaced in a small "Unclassified" notice rather than
 * silently dropped.
 *
 * Per-beat descriptors come from builtinProfileDescriptor(beat.profileId) so a
 * custom .loom profile with renamed states classifies with no code change.
 */
export function BoardView({
  isLoading,
  loadError,
  beats,
  onOpenBeat,
  onShipBeat,
  shippingByBeatId,
}: {
  isLoading: boolean;
  loadError: string | null;
  beats: Beat[];
  onOpenBeat: (beat: Beat) => void;
  onShipBeat?: (beat: Beat) => void;
  shippingByBeatId?: Record<string, unknown>;
}) {
  const groups: BoardColumnGroups = useMemo(
    () =>
      groupBeatsByBoardColumn(beats, (beat) =>
        builtinProfileDescriptor(beat.profileId),
      ),
    [beats],
  );

  if (loadError) {
    return (
      <div className="rounded-2xl bg-paper-50 p-8 text-center text-ink-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnPanel
            key={column.id}
            label={column.label}
            beats={groups[column.id]}
            isLoading={isLoading}
            onOpenBeat={onOpenBeat}
            onShipBeat={onShipBeat}
            shippingByBeatId={shippingByBeatId}
          />
        ))}
      </div>
      {groups.unclassified.length > 0 && (
        <p className="text-xs text-ochre-700">
          {groups.unclassified.length} beat(s) have a state outside this
          profile&apos;s queue/action/review/terminal sets and are not shown on
          the board. Open the card to inspect the full lifecycle.
        </p>
      )}
    </div>
  );
}

function BoardColumnPanel({
  label,
  beats,
  isLoading,
  onOpenBeat,
  onShipBeat,
  shippingByBeatId,
}: {
  label: string;
  beats: Beat[];
  isLoading: boolean;
  onOpenBeat: (beat: Beat) => void;
  onShipBeat?: (beat: Beat) => void;
  shippingByBeatId?: Record<string, unknown>;
}) {
  return (
    <section
      className={
        "flex min-h-[120px] flex-col gap-2 rounded-xl border"
        + " border-paper-200 bg-paper-100/60 p-2.5"
        + " dark:border-walnut-100 dark:bg-walnut-100/20"
      }
    >
      <header className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-paper-100">
          {label}
        </h2>
        <span className="font-mono text-xs text-ink-500">{beats.length}</span>
      </header>
      {isLoading && beats.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-ink-500">Loading…</p>
      ) : beats.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-ink-400">—</p>
      ) : (
        <div className="flex flex-col gap-2">
          {beats.map((beat) => (
            <BoardCard
              key={beat.id}
              beat={beat}
              onOpenBeat={onOpenBeat}
              onShipBeat={onShipBeat}
              isShipping={Boolean(shippingByBeatId?.[beat.id])}
            />
          ))}
        </div>
      )}
    </section>
  );
}
