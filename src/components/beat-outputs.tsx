"use client";

// "Outputs (N)" on a beat — the artifacts whose meta declares this bead,
// from the generated index (replaces the old single label-driven link).
// One chip per artifact, linking to its /artifacts/<path> viewer.

import { FileText } from "lucide-react";
import { useArtifactIndex } from "@/hooks/use-artifact-index";
import { artifactsForBead, artifactHref } from "@/lib/artifact-index";

export function BeatOutputs({ beadId }: { beadId: string }) {
  const { data } = useArtifactIndex();
  const outputs = artifactsForBead(data ?? [], beadId);
  if (outputs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Outputs ({outputs.length}):
      </span>
      {outputs.map((o) => (
        <a
          key={o.path}
          href={artifactHref(o)}
          title={o.path}
          className={
            "inline-flex max-w-[220px] items-center gap-1 truncate rounded-md"
            + " bg-lake-100 px-2 py-0.5 text-xs font-medium text-lake-700"
            + " hover:bg-lake-200 dark:bg-lake-700/30 dark:text-lake-100"
          }
        >
          <FileText className="size-3 shrink-0" />
          <span className="truncate">{o.title}</span>
        </a>
      ))}
    </div>
  );
}
