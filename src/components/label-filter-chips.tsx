"use client";

import { useMemo } from "react";
import type { Beat } from "@/lib/types";
import { collectLabels, groupLabels } from "@/lib/label-filter";

/**
 * Global label filter chips (A4). Renders the labels present in the current
 * beat set, grouped by namespace (work:* first via groupLabels), as toggleable
 * chips. Selection is OR-semantics and applied by the caller through
 * filterBeatsByLabels — pure view over already-fetched beats, no second store.
 */
export function LabelFilterChips({
  beats,
  selected,
  onToggle,
  onClear,
}: {
  beats: Beat[];
  selected: string[];
  onToggle: (label: string) => void;
  onClear: () => void;
}) {
  const groups = useMemo(
    () => groupLabels(collectLabels(beats)),
    [beats],
  );
  if (groups.length === 0) return null;
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-lake-700 hover:underline"
        >
          Clear ({selected.length})
        </button>
      )}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {group.label}
          </span>
          {group.labels.map((label) => (
            <Chip
              key={label}
              active={selectedSet.has(label)}
              onClick={() => onToggle(label)}
            >
              {label.includes(":") ? label.slice(label.indexOf(":") + 1) : label}
            </Chip>
          ))}
        </div>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full border px-2 py-0.5 text-xs transition-colors "
        + (active
          ? "border-lake-300 bg-lake-100 text-lake-700 font-medium"
          : "border-border text-muted-foreground hover:bg-muted/40")
      }
    >
      {children}
    </button>
  );
}
