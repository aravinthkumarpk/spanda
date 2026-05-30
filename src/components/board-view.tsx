"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Beat } from "@/lib/types";
import {
  BOARD_COLUMNS,
  type BoardColumnId,
  groupBeatsByBoardColumn,
  type BoardColumnGroups,
} from "@/lib/board-columns";
import { builtinProfileDescriptor } from "@/lib/workflows";
import { listBuckets } from "@/lib/bucket-profile";
import { filterBeatsByLabels } from "@/lib/label-filter";
import { BoardCard } from "@/components/board-card";
import { BucketFilter } from "@/components/bucket-filter";
import { resolveDropTarget } from "@/components/board-drag-target";
import { repoPathForBeat } from "@/components/beat-table-mutations";
import { updateBeat } from "@/lib/api";
import { invalidateBeatListQueries } from "@/lib/beat-query-cache";

/**
 * Drag-and-drop moves (A2). Dropping a card resolves the loom-legal target
 * state for that column, applies it optimistically, PATCHes via the API, and
 * reverts on failure. Terminal (Done) drops confirm first. The optimistic
 * overlay is pruned once the refetched data catches up, so it never goes stale.
 */
function useBoardDnd(beats: Beat[]) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Record<string, string>>({});
  const byId = useMemo(
    () => new Map(beats.map((b) => [b.id, b])),
    [beats],
  );

  const onDropBeat = useCallback(
    async (beatId: string, column: BoardColumnId) => {
      const beat = byId.get(beatId);
      if (!beat) return;
      const descriptor = builtinProfileDescriptor(beat.profileId);
      const res = resolveDropTarget(beat, column, descriptor);
      if (!res) return;
      if (
        res.isTerminal
        && !window.confirm(`Move “${beat.title}” to Done?`)
      ) return;
      setPending((p) => ({ ...p, [beatId]: res.targetState }));
      const r = await updateBeat(
        beat.id,
        { state: res.targetState },
        repoPathForBeat(beat),
      );
      if (!r.ok) {
        setPending((p) => {
          const n = { ...p };
          delete n[beatId];
          return n;
        });
        toast.error(r.error ?? "Move failed");
        return;
      }
      void invalidateBeatListQueries(queryClient);
    },
    [byId, queryClient],
  );

  // Apply an optimistic override only while it still differs from the server
  // state; once a refetch catches up (override === real state) it's inert, so
  // there's no stale-pin and no effect needed to prune it.
  const effectiveBeats = useMemo(
    () =>
      beats.map((b) =>
        pending[b.id] && pending[b.id] !== b.state
          ? { ...b, state: pending[b.id] }
          : b,
      ),
    [beats, pending],
  );

  return { effectiveBeats, onDropBeat };
}

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
  const [now] = useState(() => Date.now());
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const { effectiveBeats, onDropBeat } = useBoardDnd(beats);
  const presentBuckets = useMemo(
    () =>
      listBuckets().filter((bucket) =>
        beats.some((beat) => beat.labels.includes(bucket)),
      ),
    [beats],
  );
  const filtered = useMemo(
    () => filterBeatsByLabels(effectiveBeats, selectedBuckets),
    [effectiveBeats, selectedBuckets],
  );
  const groups: BoardColumnGroups = useMemo(
    () =>
      groupBeatsByBoardColumn(filtered, (beat) =>
        builtinProfileDescriptor(beat.profileId),
      ),
    [filtered],
  );
  const toggleBucket = (bucket: string) =>
    setSelectedBuckets((current) =>
      current.includes(bucket)
        ? current.filter((b) => b !== bucket)
        : [...current, bucket],
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
      <BucketFilter
        buckets={presentBuckets}
        selected={selectedBuckets}
        onToggle={toggleBucket}
        onClear={() => setSelectedBuckets([])}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnPanel
            key={column.id}
            columnId={column.id}
            label={column.label}
            beats={groups[column.id]}
            isLoading={isLoading}
            now={now}
            onOpenBeat={onOpenBeat}
            onShipBeat={onShipBeat}
            shippingByBeatId={shippingByBeatId}
            onDropBeat={onDropBeat}
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
  columnId,
  label,
  beats,
  isLoading,
  now,
  onOpenBeat,
  onShipBeat,
  shippingByBeatId,
  onDropBeat,
}: {
  columnId: BoardColumnId;
  label: string;
  beats: Beat[];
  isLoading: boolean;
  now: number;
  onOpenBeat: (beat: Beat) => void;
  onShipBeat?: (beat: Beat) => void;
  shippingByBeatId?: Record<string, unknown>;
  onDropBeat: (beatId: string, column: BoardColumnId) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropBeat(id, columnId);
      }}
      className={
        "flex min-h-[120px] flex-col gap-2 rounded-xl border"
        + " border-paper-200 bg-paper-100/60 p-2.5"
        + " dark:border-walnut-100 dark:bg-walnut-100/20"
        + (isOver ? " ring-2 ring-lake-400" : "")
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
              now={now}
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
