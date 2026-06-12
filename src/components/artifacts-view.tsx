"use client";

// Artifacts view (/beats?view=artifacts): every active bead carrying the
// `artifact` label — the v0 task-output convention. Each row opens the
// compiled output at /artifacts/<id> (server-rendered from
// html-artifacts/docs/beads/<id>.html).

import { FileText, ChevronRight, MessageSquare } from "lucide-react";
import type { Beat } from "@/lib/types";
import { selectArtifactBeats } from "@/lib/artifact-select";
import { BeatPriorityBadge } from "@/components/beat-priority-badge";
import { Badge } from "@/components/ui/badge";

function ArtifactRow({ beat }: { beat: Beat }) {
  const comments = beat.comment_count as number | undefined;
  return (
    <a
      href={`/artifacts/${beat.id}`}
      className={
        "group grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_116px_18px]"
        + " items-center gap-2.5 rounded-lg border border-border/60 bg-card"
        + " px-3 py-2.5 transition-colors hover:border-lake-400/60"
        + " hover:bg-muted/40"
      }
      data-artifact={beat.id}
    >
      <BeatPriorityBadge priority={beat.priority} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{beat.title}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {beat.id}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        {comments != null && comments > 0 && (
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="size-3" />
            {comments}
          </Badge>
        )}
        <Badge variant="secondary">{beat.state}</Badge>
      </div>
      <ChevronRight
        className={
          "size-4 text-muted-foreground opacity-0 transition-opacity"
          + " group-hover:opacity-100"
        }
      />
    </a>
  );
}

export function ArtifactsView({
  beats,
  isLoading,
}: {
  beats: Beat[];
  isLoading: boolean;
}) {
  const artifacts = selectArtifactBeats(beats);
  return (
    <div className="mx-auto max-w-4xl space-y-2 py-2">
      <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
        <FileText className="size-4" />
        Task outputs — compiled HTML attached to work items. Comment on an
        output and it lands on the task itself.
      </div>
      {artifacts.map((b) => (
        <ArtifactRow key={b.id} beat={b} />
      ))}
      {!isLoading && artifacts.length === 0 && (
        <div
          className={
            "rounded-lg border border-dashed border-border/70 p-8"
            + " text-center text-sm text-muted-foreground"
          }
        >
          No task outputs yet. Tag a task with the
          <code className="mx-1 font-mono">artifact</code>
          label and drop its HTML at
          <code className="mx-1 font-mono">docs/beads/&lt;id&gt;.html</code>.
        </div>
      )}
    </div>
  );
}
