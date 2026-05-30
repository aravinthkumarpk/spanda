import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeatStateBadge } from "@/components/beat-state-badge";
import { cn } from "@/lib/utils";
import type { Beat } from "@/lib/types";

/**
 * status-page — the per-initiative status surface (ADR-0003 / iteration 02 B4).
 *
 * One page per initiative. It is a pure VIEW over beads — it renders the
 * initiative's live lifecycle state, the agent-written "what's done"
 * (`metadata.status`), any pending question that needs the human, and the
 * breakdown of child tasks with their own states. It never holds state of its
 * own and never writes; the board (via the REST API) remains the one source of
 * truth. "Needs you" is read from the loom-derived `requiresHumanAction` flag,
 * not from any hardcoded state-name pattern (CLAUDE.md).
 */

function readMetaString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function NeedsYouPill() {
  return (
    <Badge
      variant="outline"
      className="bg-clay-100 text-clay-700 dark:bg-clay-700 dark:text-clay-100"
    >
      ✋ Needs you
    </Badge>
  );
}

function TaskRow({ task }: { task: Beat }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="truncate text-sm text-ink-700 dark:text-paper-300">
        {task.title}
      </span>
      <BeatStateBadge state={task.state} />
    </li>
  );
}

function StatusSection({
  title,
  body,
  empty,
  mono,
}: {
  title: string;
  body: string | undefined;
  empty: string;
  mono?: boolean;
}) {
  return (
    <section className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-paper-500">
        {title}
      </h3>
      {body
        ? (
          <p
            className={cn(
              "mt-1 text-sm text-ink-800 dark:text-paper-200",
              mono && "whitespace-pre-wrap font-mono text-[13px]",
            )}
          >
            {body}
          </p>
        )
        : (
          <p className="mt-1 text-sm italic text-ink-400 dark:text-paper-600">
            {empty}
          </p>
        )}
    </section>
  );
}

export interface StatusPageProps {
  /** The initiative this page is the status surface for. */
  initiative: Beat;
  /** The initiative's child task beats (the breakdown / live progress). */
  tasks?: Beat[];
  className?: string;
}

export function StatusPage({ initiative, tasks, className }: StatusPageProps) {
  const meta = initiative.metadata;
  const status = readMetaString(meta, "status");
  const question = readMetaString(meta, "question");
  const plan = readMetaString(meta, "plan");
  const childTasks = tasks ?? [];

  return (
    <Card className={cn("max-w-2xl", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{initiative.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {initiative.requiresHumanAction ? <NeedsYouPill /> : null}
            <BeatStateBadge state={initiative.state} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {question
          ? (
            <section className="rounded-md border border-clay-300 bg-clay-50 px-3 py-2 dark:border-clay-700 dark:bg-clay-900/30">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-clay-700 dark:text-clay-200">
                ✋ Open question
              </h3>
              <p className="mt-1 text-sm text-ink-800 dark:text-paper-200">
                {question}
              </p>
            </section>
          )
          : null}

        <StatusSection
          title="What's done"
          body={status}
          empty="No status yet — nothing has run."
        />

        {plan
          ? <StatusSection title="Plan" body={plan} empty="" mono />
          : null}

        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-paper-500">
            Tasks ({childTasks.length})
          </h3>
          {childTasks.length > 0
            ? (
              <ul className="mt-1 divide-y divide-paper-200 dark:divide-walnut-100">
                {childTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            )
            : (
              <p className="mt-1 text-sm italic text-ink-400 dark:text-paper-600">
                No tasks yet — this initiative runs as a single unit.
              </p>
            )}
        </section>
      </CardContent>
    </Card>
  );
}
