// Runs strip on /today — the run & blocker inbox (5wo.1). Server-rendered
// from the session-feeder's run-feed.json; ordering/windowing logic lives
// (tested) in selectRunsStrip.
import type { RunRecord } from "@/lib/external-session-feeder/types";

const STATUS_STYLE: Record<RunRecord["status"], string> = {
  blocked: "bg-amber-100 text-amber-900 border-amber-300",
  running: "bg-sky-100 text-sky-900 border-sky-300",
  done: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

const STATUS_DOT: Record<RunRecord["status"], string> = {
  blocked: "🟠",
  running: "🔵",
  done: "✅",
};

function repoName(repoPath?: string): string {
  if (!repoPath) return "unattributed";
  return repoPath.split("/").filter(Boolean).pop() ?? repoPath;
}

export function RunsStrip({ runs }: { runs: RunRecord[] }) {
  if (runs.length === 0) return null;
  return (
    <div className="border-b border-paper-200 bg-paper-50 px-6 py-2">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Agent runs
        </span>
        {runs.slice(0, 8).map((r) => (
          <span
            key={r.sessionId}
            title={r.sessionId}
            className={
              `inline-flex items-center gap-1.5 rounded-full border px-2.5`
              + ` py-0.5 text-xs ${STATUS_STYLE[r.status]}`
            }
          >
            {STATUS_DOT[r.status]}
            <span className="max-w-[220px] truncate font-medium">
              {r.title ?? r.sessionId.slice(0, 8)}
            </span>
            <span className="opacity-70">{repoName(r.repoPath)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
