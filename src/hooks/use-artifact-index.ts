"use client";

import { useQuery } from "@tanstack/react-query";
import type { IndexEntry } from "@/lib/artifact-index";

async function fetchArtifactIndex(): Promise<IndexEntry[]> {
  const res = await fetch("/api/artifacts");
  if (!res.ok) throw new Error(`artifact index fetch failed (${res.status})`);
  return ((await res.json()) as { data: IndexEntry[] }).data;
}

/** The artifact index, shared by the Library view and beat-detail Outputs. */
export function useArtifactIndex() {
  return useQuery({
    queryKey: ["artifact-index"],
    queryFn: fetchArtifactIndex,
    staleTime: 60_000,
  });
}
