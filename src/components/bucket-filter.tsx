"use client";

import { bucketCardLabel } from "@/lib/bucket-profile";

/**
 * Bucket filter chips (Q3: "bucket = a filter chip, not a column"). Renders one
 * chip per canonical work:* bucket present in the data plus an "All" reset.
 * Selection is OR-semantics and is applied by the caller via filterBeatsByLabels
 * — this component is pure presentation over the already-fetched beats, so it
 * introduces no second store.
 */
export function BucketFilter({
  buckets,
  selected,
  onToggle,
  onClear,
}: {
  buckets: string[];
  selected: string[];
  onToggle: (bucket: string) => void;
  onClear: () => void;
}) {
  if (buckets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip active={selected.length === 0} onClick={onClear}>
        All
      </Chip>
      {buckets.map((bucket) => (
        <Chip
          key={bucket}
          active={selected.includes(bucket)}
          onClick={() => onToggle(bucket)}
        >
          {bucketCardLabel([bucket]) ?? bucket}
        </Chip>
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
        "rounded-full border px-2.5 py-0.5 text-xs font-medium"
        + " transition-colors "
        + (active
          ? "border-lake-300 bg-lake-100 text-lake-700"
          + " dark:border-lake-700 dark:bg-lake-700/40 dark:text-lake-100"
          : "border-paper-200 text-ink-500 hover:bg-paper-100"
          + " dark:border-walnut-100 dark:text-paper-400")
      }
    >
      {children}
    </button>
  );
}
