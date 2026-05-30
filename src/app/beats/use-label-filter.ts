"use client";

import { useMemo } from "react";
import type { Beat } from "@/lib/types";
import { filterBeatsByLabels, parseLabelsParam } from "@/lib/label-filter";

/**
 * Client-side label filter (A4). Parses the ?labels= URL value and applies
 * filterBeatsByLabels (OR-semantics) over the already-displayed beats. Pure
 * view over fetched data — no second store.
 */
export function useLabelFilter(
  displayedBeats: Beat[],
  labelsParam: string | null,
): { selectedLabels: string[]; labelFilteredBeats: Beat[] } {
  const selectedLabels = useMemo(
    () => parseLabelsParam(labelsParam),
    [labelsParam],
  );
  const labelFilteredBeats = useMemo(
    () => filterBeatsByLabels(displayedBeats, selectedLabels),
    [displayedBeats, selectedLabels],
  );
  return { selectedLabels, labelFilteredBeats };
}
