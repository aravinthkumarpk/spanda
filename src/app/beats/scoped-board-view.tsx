"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Beat } from "@/lib/types";
import { BoardView } from "@/components/board-view";
import { filterToProjectDescendants } from "@/lib/project-scope-filter";

/**
 * The Board, optionally scoped to one project's subtree (iteration 02, A3).
 * When the URL carries `?project=<id>` — set by a project's "Board →" link on
 * the Projects view — the board shows only that project and its descendants; a
 * clear link drops back to the full board. The scope is a pure view filter:
 * the board reads the same beats, just narrowed, so nothing downstream changes.
 */
export function ScopedBoardView({
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
  const projectScope = useSearchParams().get("project");
  const scoped = projectScope
    ? filterToProjectDescendants(beats, projectScope)
    : beats;
  return (
    <>
      {projectScope && (
        <div className="mb-2 flex items-center gap-2 text-xs text-ink-600">
          <span>
            Board scoped to project{" "}
            <code className="font-mono">{projectScope}</code>
          </span>
          <Link
            href="/beats?view=board"
            className="text-lake-700 hover:underline"
          >
            clear
          </Link>
        </div>
      )}
      <BoardView
        isLoading={isLoading}
        loadError={loadError}
        beats={scoped}
        onOpenBeat={onOpenBeat}
        onShipBeat={onShipBeat}
        shippingByBeatId={shippingByBeatId}
      />
    </>
  );
}
