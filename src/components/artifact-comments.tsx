"use client";

// Comment island under /artifacts/[id]: comments land on the TASK
// (bd comments via the API), so the next agent run sees them. Repo comes
// from the app store (active repo, or the only registered one) — with
// several repos and none active we say so instead of guessing.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { MAX_COMMENT_LENGTH, type BeadComment } from "@/lib/bead-comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function useCommentsRepo(): string | null {
  const { activeRepo, registeredRepos } = useAppStore();
  if (activeRepo) return activeRepo;
  if (registeredRepos.length === 1) return registeredRepos[0].path;
  return null;
}

async function fetchComments(
  beadId: string,
  repo: string,
): Promise<BeadComment[]> {
  const res = await fetch(
    `/api/beats/${beadId}/comments?_repo=${encodeURIComponent(repo)}`,
  );
  if (!res.ok) throw new Error(`comments fetch failed (${res.status})`);
  return ((await res.json()) as { data: BeadComment[] }).data;
}

function CommentList({ comments }: { comments: BeadComment[] }) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet — the first one steers the next agent run.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="rounded-lg border border-border/60 p-3">
          <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{c.author}</span>
            <span>{c.createdAt.slice(0, 16).replace("T", " ")}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function ArtifactComments({ beadId }: { beadId: string }) {
  const repo = useCommentsRepo();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const { data: comments, error } = useQuery({
    queryKey: ["bead-comments", repo, beadId],
    queryFn: () => fetchComments(beadId, repo as string),
    enabled: repo !== null,
  });

  const canSubmit =
    draft.trim() !== "" && draft.length <= MAX_COMMENT_LENGTH && !posting;

  async function submit() {
    if (!canSubmit || repo === null) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(
        `/api/beats/${beadId}/comments?_repo=${encodeURIComponent(repo)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: draft }),
        },
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `post failed (${res.status})`);
      }
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: ["bead-comments", repo, beadId],
      });
    } catch (err) {
      setPostError(err instanceof Error ? err.message : String(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="size-4" />
        Comments on this task
      </h2>
      {repo === null ? (
        <p className="text-sm text-muted-foreground">
          Several repos are registered and none is active — pick a repo in
          the board first, then comment here.
        </p>
      ) : (
        <>
          {error ? (
            <p className="text-sm text-rust-700">
              Could not load comments: {String(error)}
            </p>
          ) : (
            <CommentList comments={comments ?? []} />
          )}
          <div className="mt-4 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Direct the next run — lands on the task as a bd comment"
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
            />
            {postError && (
              <p className="text-sm text-rust-700">{postError}</p>
            )}
            <Button onClick={submit} disabled={!canSubmit} className="gap-1.5">
              <Send className="size-3.5" />
              {posting ? "Posting…" : "Comment"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
