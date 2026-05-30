"use client";

import { AlertTriangle } from "lucide-react";

/** Shown while the repo list is still resolving on first paint. */
export function StreamingEmptyState() {
  return (
    <div
      data-testid="streaming-empty-state"
      className={
        "flex items-center justify-center"
        + " py-6 text-sm text-muted-foreground"
      }
    >
      Loading repositories...
    </div>
  );
}

/** Shown when an all-repositories search returns nothing. */
export function AllReposEmptyState() {
  return (
    <div
      data-testid="all-repos-empty-state"
      className={
        "flex items-center justify-center"
        + " py-6 text-sm text-muted-foreground"
      }
    >
      No results found across all repositories.
    </div>
  );
}

/** Inline banner shown when the beat list loaded in a degraded state. */
export function DegradedBanner(
  { message }: { message: string | null },
) {
  return (
    <div className={
      "mb-2 flex items-center gap-2 rounded-md"
      + " border border-feature-400 bg-feature-100"
      + " px-3 py-2 text-sm text-feature-700"
      + " dark:border-feature-700"
      + " dark:bg-feature-700 dark:text-feature-100"
    }>
      <AlertTriangle
        className="size-4 shrink-0"
      />
      <span>{message}</span>
    </div>
  );
}
