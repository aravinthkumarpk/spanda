"use client";

import { useMemo, useState } from "react";
import type { Beat } from "@/lib/types";
import { hideStaleCompleted } from "@/lib/active-filter";
import { builtinProfileDescriptor } from "@/lib/workflows";

/**
 * Hide completed work older than `days` (default 7) from the views — board,
 * Projects, lists. Recently-done still shows. `now` is taken once at mount so
 * the render stays pure.
 */
export function useActiveFilter(beats: Beat[], days = 7): Beat[] {
  const [now] = useState(() => Date.now());
  return useMemo(
    () =>
      hideStaleCompleted(
        beats,
        now,
        (beat) => builtinProfileDescriptor(beat.profileId),
        days,
      ),
    [beats, now, days],
  );
}
