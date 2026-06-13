"use client";

// Library (/beats?view=artifacts): the artifact-centric view. Reads the
// generated artifact-index, lists WORK artifacts by kind (output/plan/weekly/
// daily — examples + orphan docs excluded), each linking to its /artifacts/
// <path> and back to its bead. The old bead-tagged list is retired.

import { FileText, ChevronRight, MessageSquare } from "lucide-react";
import { useArtifactIndex } from "@/hooks/use-artifact-index";
import {
  groupLibraryByKind,
  artifactHref,
  type IndexEntry,
} from "@/lib/artifact-index";
import { Badge } from "@/components/ui/badge";

function ArtifactRow({ entry }: { entry: IndexEntry }) {
  return (
    <a
      href={artifactHref(entry)}
      className={
        "group grid grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-2.5"
        + " rounded-lg border border-border/60 bg-card px-3 py-2.5"
        + " transition-colors hover:border-lake-400/60 hover:bg-muted/40"
      }
      data-artifact={entry.path}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{entry.title}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {entry.path}
        </div>
      </div>
      {entry.beads.length > 0 && (
        <Badge variant="secondary" className="font-mono">
          {entry.beads.length === 1
            ? entry.beads[0]
            : `${entry.beads.length} beads`}
        </Badge>
      )}
      <ChevronRight
        className={
          "size-4 text-muted-foreground opacity-0 transition-opacity"
          + " group-hover:opacity-100"
        }
      />
    </a>
  );
}

export function ArtifactsView() {
  const { data, isLoading, error } = useArtifactIndex();
  const sections = groupLibraryByKind(data ?? []);

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-4" />
        Library — compiled HTML artifacts (outputs, plans, reviews, dailies),
        cross-linked to their tasks.
      </div>
      {error && (
        <div className="text-sm text-rust-700">
          Could not load the artifact index: {String(error)}
        </div>
      )}
      {sections.map((section) => (
        <section key={section.kind} className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {section.label}
            <span className="text-xs font-normal text-muted-foreground">
              {section.entries.length}
            </span>
          </h3>
          {section.entries.map((e) => (
            <ArtifactRow key={e.path} entry={e} />
          ))}
        </section>
      ))}
      {!isLoading && !error && sections.length === 0 && (
        <div
          className={
            "rounded-lg border border-dashed border-border/70 p-8"
            + " text-center text-sm text-muted-foreground"
          }
        >
          No artifacts indexed yet. Compile an artifact under
          <code className="mx-1 font-mono">html-artifacts/docs/</code>
          and run <code className="mx-1 font-mono">gen-artifact-index</code>.
        </div>
      )}
      <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <MessageSquare className="size-3" />
        Open an output to read it and comment — comments land on its task.
      </p>
    </div>
  );
}
