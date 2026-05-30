// StaleBadge — surfaces beats that haven't moved in 7+ days.
//
// Renders nothing if the bead is terminal (already done, no need to
// flag), if updatedAt is missing/malformed (fail-soft), or if the
// age is below the 7-day threshold.
//
// Threshold uses STRICT greater-than: exactly 7 days = no badge, 8+ days = badge.
// Rationale: a bead updated exactly 7 days ago is at the boundary of
// "recent enough to still be active"; flagging it would generate noise
// every Monday morning for any bead from last Monday.
//
// Styling per DESIGN.md: warning-pale background + warning-content text
// (Tailwind ochre family in the spanda mapping).

import type React from "react";
import { isStale, staleAgeDays } from "@/lib/stale";

interface StaleBadgeProps {
  /** ISO 8601 timestamp string of last update, or null if unknown. */
  updatedAt: string | null | undefined;
  /** Whether the bead is in a terminal state (shipped, abandoned, done, etc.). */
  isTerminal: boolean;
  /**
   * Current time in ms. Required (not defaulted to Date.now()) because
   * React 19's `react-hooks/purity` rule rejects calling impure functions
   * during render. Caller is responsible for supplying it — TanStack
   * table cell renderers do this naturally outside the hook tree.
   */
  now: number;
}

export function StaleBadge({
  updatedAt,
  isTerminal,
  now,
}: StaleBadgeProps): React.ReactElement | null {
  // Single source for the stale rule: src/lib/stale.ts (strict >, fail-soft
  // on null/malformed). isStale covers terminal? no — terminal is a separate
  // suppression, kept here.
  if (isTerminal) return null;
  if (!isStale(updatedAt, now)) return null;
  const days = staleAgeDays(updatedAt, now);
  if (days === null) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold tracking-wider uppercase bg-ochre-100 text-ochre-700"
      title={`Not updated in ${days} day${days === 1 ? "" : "s"}`}
    >
      stale {days}d
    </span>
  );
}
