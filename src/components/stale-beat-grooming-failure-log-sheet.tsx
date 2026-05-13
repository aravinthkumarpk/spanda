"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  StaleBeatGroomingFailureLog,
  StaleBeatGroomingReviewRecord,
} from "@/lib/stale-beat-grooming-types";

interface FailureLogSheetProps {
  open: boolean;
  review: StaleBeatGroomingReviewRecord | null;
  log: StaleBeatGroomingFailureLog | null;
  onOpenChange: (open: boolean) => void;
}

export function StaleBeatGroomingFailureLogSheet({
  open,
  review,
  log,
  onOpenChange,
}: FailureLogSheetProps) {
  const transcript = log ? formatTranscript(log) : "";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(92vw,720px)] gap-0 p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle>Stale grooming log</SheetTitle>
          <SheetDescription>
            {review
              ? `${review.beatId} failed on ${review.agentId}`
              : "No failed review selected"}
          </SheetDescription>
        </SheetHeader>
        {log ? (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
            <dl className="grid gap-2 border-b border-border/70 px-5 py-3 text-xs sm:grid-cols-2">
              <LogDetail label="Command" value={log.command} />
              <LogDetail label="CWD" value={log.cwd} />
              <LogDetail label="Elapsed" value={formatMs(log.elapsedMs)} />
              <LogDetail
                label="First output"
                value={log.firstOutputAfterMs === null
                  ? "none captured"
                  : formatMs(log.firstOutputAfterMs)}
              />
              <LogDetail label="Stdout bytes" value={`${log.stdoutBytes}`} />
              <LogDetail label="Stderr bytes" value={`${log.stderrBytes}`} />
            </dl>
            <pre className="overflow-auto whitespace-pre-wrap break-words bg-ink-950 p-5 font-mono text-xs leading-5 text-paper-50">
              {transcript || "No stdout, stderr, assistant text, or result text was captured."}
            </pre>
          </div>
        ) : (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            No failure log is available for this review.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LogDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground">{value}</dd>
    </div>
  );
}

function formatTranscript(log: StaleBeatGroomingFailureLog): string {
  return [
    section("stderr", log.stderr),
    section("assistant", log.assistantText),
    section("result", log.resultText),
    section("stdout", log.stdout),
  ].filter(Boolean).join("\n\n");
}

function section(label: string, text: string): string {
  const trimmed = text.trim();
  return trimmed ? `--- ${label} ---\n${trimmed}` : "";
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
