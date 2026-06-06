"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Beat } from "@/lib/types";
import {
  groupIntoProjectTree,
  type ProjectNode,
} from "@/lib/project-tree";
import {
  classifyProjectHealth,
  type ProjectHealth,
} from "@/lib/project-health";
import { builtinProfileDescriptor } from "@/lib/workflows";
import { isTerminalBeatState } from "@/lib/beat-terminal";
import { compareBeatsByPriorityThenState } from "@/lib/beat-sort";
import { dueState, type DueTone } from "@/lib/due-date";
import { ProjectHealthBadge } from "@/components/project-health-badge";
import { BeatStateBadge } from "@/components/beat-state-badge";
import { BeatPriorityBadge } from "@/components/beat-priority-badge";
import { Pencil, Star, ChevronRight, Zap } from "lucide-react";

/**
 * Altitude-3 Projects view — "variant A": an expanded, priority-sorted rollup.
 * Projects are stacked full-width, ordered high->low priority; each lists its
 * initiatives (also priority-sorted) as scannable rows showing status, task
 * progress, and a due date. A focus strip on top surfaces the <=5 initiatives
 * (labelled `focus`) that close the next milestone. Clicking any row opens the
 * detail modal (tasks + status + gates). Terminal beats are dropped so the
 * rollup is active work only. A "now" snapshot is taken once at mount so the
 * render stays pure.
 */
const FOCUS_LABEL = "focus";
const DO_FOCUS_LABEL = "focus:do";
function isFocusBeat(beat: Beat): boolean {
  return (beat.labels ?? []).includes(FOCUS_LABEL);
}
function isDoFocusBeat(beat: Beat): boolean {
  return (beat.labels ?? []).includes(DO_FOCUS_LABEL);
}

const byPriority = (a: { beat: Beat }, b: { beat: Beat }) =>
  compareBeatsByPriorityThenState(a.beat, b.beat);

// One shared column grid so the per-project header labels and every row line
// up as real columns: priority · title · status · tasks · due · trailing.
const ROW_COLS =
  "grid grid-cols-[44px_minmax(0,1fr)_116px_56px_92px_18px] items-center gap-2.5";

export function ProjectsView({
  isLoading,
  loadError,
  beats,
  onOpenBeat,
}: {
  isLoading: boolean;
  loadError: string | null;
  beats: Beat[];
  onOpenBeat: (beat: Beat) => void;
}) {
  const [now] = useState(() => Date.now());
  const active = useMemo(
    () => beats.filter((b) => !isTerminalBeatState(b.state)),
    [beats],
  );
  const tree = useMemo(() => groupIntoProjectTree(active), [active]);
  const projects = useMemo(() => {
    const list = tree.unsorted.tasks.length > 0
      ? [...tree.projects, tree.unsorted]
      : [...tree.projects];
    return list.sort(byPriority);
  }, [tree]);
  const focusBeats = useMemo(
    () => active.filter(isFocusBeat).sort(compareBeatsByPriorityThenState),
    [active],
  );
  const doFocusBeats = useMemo(
    () => active.filter(isDoFocusBeat).sort(compareBeatsByPriorityThenState),
    [active],
  );

  if (loadError) {
    return (
      <div className="rounded-2xl bg-paper-50 p-8 text-center text-ink-700">
        {loadError}
      </div>
    );
  }
  if (!isLoading && projects.length === 0) {
    return (
      <div className="rounded-2xl bg-paper-50 p-8 text-center text-ink-700">
        No projects yet. A project is a parent task; group tasks under one to
        see it here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FocusStrip items={focusBeats} onOpenBeat={onOpenBeat} />
      <DoFocusStrip items={doFocusBeats} onOpenBeat={onOpenBeat} />
      {projects.map((project) => (
        <ProjectSection
          key={project.id}
          project={project}
          now={now}
          onOpenBeat={onOpenBeat}
        />
      ))}
    </div>
  );
}

/** Top strip: the <=5 milestone-closing initiatives, or a prompt to set them. */
function FocusStrip({
  items,
  onOpenBeat,
}: {
  items: Beat[];
  onOpenBeat: (beat: Beat) => void;
}) {
  if (items.length === 0) {
    return (
      <section
        className={
          "rounded-xl border border-dashed border-ochre-400 bg-ochre-100"
          + " px-4 py-3 text-sm text-ochre-700"
          + " dark:border-ochre-700 dark:bg-ochre-700/15 dark:text-ochre-100"
        }
      >
        <span className="font-semibold">🎯 Focus</span>{" — "}
        the up-to-5 initiatives that close your next milestone. Nothing focused
        yet today; your daily review picks these each morning.
      </section>
    );
  }
  return (
    <section
      className={
        "rounded-xl bg-moss-700 px-4 py-3 text-paper-50"
        + " dark:bg-moss-700/80"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            "rounded bg-paper-50/15 px-2 py-0.5 font-mono text-[10px]"
            + " uppercase tracking-wider"
          }
        >
          🎯 Focus
        </span>
        <span className="text-sm font-semibold">Close the next milestone</span>
        <span className="ml-auto font-mono text-[11px] text-moss-100">
          {items.length} of ≤5 · set by your daily review
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((beat, i) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => onOpenBeat(beat)}
            className={
              "cursor-pointer rounded-full border border-paper-50/25"
              + " bg-paper-50/10 px-2.5 py-1 text-left text-xs text-paper-50"
              + " hover:bg-paper-50/20"
            }
          >
            <span className="mr-1.5 font-mono text-paper-50/60">{i + 1}</span>
            {beat.title}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Second strip: the <=5 do-dominant initiatives you personally execute today. */
function DoFocusStrip({
  items,
  onOpenBeat,
}: {
  items: Beat[];
  onOpenBeat: (beat: Beat) => void;
}) {
  if (items.length === 0) {
    return (
      <section
        className={
          "rounded-xl border border-dashed border-lake-400 bg-lake-100/60"
          + " px-4 py-3 text-sm text-lake-700"
          + " dark:border-lake-700 dark:bg-lake-700/15 dark:text-lake-100"
        }
      >
        <span className="font-semibold">⚡ Do top-5</span>{" — "}
        the up-to-5 initiatives you personally execute today (not chase or
        coordinate). Your daily review picks these each morning.
      </section>
    );
  }
  return (
    <section
      className={"rounded-xl bg-lake-700 px-4 py-3 text-paper-50 dark:bg-lake-700/80"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            "rounded bg-paper-50/15 px-2 py-0.5 font-mono text-[10px]"
            + " uppercase tracking-wider"
          }
        >
          ⚡ Do top-5
        </span>
        <span className="text-sm font-semibold">What you build today</span>
        <span className="ml-auto font-mono text-[11px] text-lake-100">
          {items.length} of ≤5 · set by your daily review
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.map((beat, i) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => onOpenBeat(beat)}
            className={
              "cursor-pointer rounded-full border border-paper-50/25"
              + " bg-paper-50/10 px-2.5 py-1 text-left text-xs text-paper-50"
              + " hover:bg-paper-50/20"
            }
          >
            <span className="mr-1.5 font-mono text-paper-50/60">{i + 1}</span>
            {beat.title}
          </button>
        ))}
      </div>
    </section>
  );
}

/** All descendant (initiative + task) beats — the "children" health reads. */
function collectChildBeats(project: ProjectNode): Beat[] {
  const fromTasks = project.tasks.map((task) => task.beat);
  const fromInitiatives = project.initiatives.flatMap((initiative) => [
    initiative.beat,
    ...initiative.tasks.map((task) => task.beat),
  ]);
  return [...fromTasks, ...fromInitiatives];
}

/** Column labels shared by every row in a project section. */
function ColumnHeader() {
  return (
    <div
      className={
        ROW_COLS + " px-2 pb-1 pt-1.5 font-mono text-[10px]"
        + " uppercase tracking-wide text-ink-500"
      }
    >
      <span />
      <span />
      <span>Status</span>
      <span className="text-right">Tasks</span>
      <span className="text-right">Due</span>
      <span />
    </div>
  );
}

function ProjectSection({
  project,
  now,
  onOpenBeat,
}: {
  project: ProjectNode;
  now: number;
  onOpenBeat: (beat: Beat) => void;
}) {
  const children = useMemo(() => collectChildBeats(project), [project]);
  const health: ProjectHealth = useMemo(
    () =>
      classifyProjectHealth(children, now, (beat) =>
        builtinProfileDescriptor(beat.profileId),
      ),
    [children, now],
  );
  const initiatives = useMemo(
    () => [...project.initiatives].sort(byPriority),
    [project],
  );
  const directTasks = useMemo(
    () => [...project.tasks].sort(byPriority),
    [project],
  );
  const taskCount = project.tasks.length
    + project.initiatives.reduce((sum, i) => sum + i.tasks.length, 0);
  const scopedBoardHref =
    `/beats?view=board&project=${encodeURIComponent(project.id)}`;

  return (
    <section className="flex flex-col">
      <header
        className={
          "flex items-center gap-2.5 border-b-2 border-ink-900/85 pb-1.5"
          + " dark:border-paper-100/30"
        }
      >
        <BeatPriorityBadge priority={project.beat.priority} />
        {/* Primary click opens the Board SCOPED to this project. Editing the
            project's own card is the secondary affordance (the pencil). */}
        <Link
          href={scopedBoardHref}
          title="Open the board scoped to this project"
          className={
            "text-base font-semibold leading-snug text-ink-900"
            + " hover:text-lake-700 dark:text-paper-100"
          }
        >
          {project.title}
        </Link>
        <button
          type="button"
          onClick={() => onOpenBeat(project.beat)}
          title="Edit project details"
          className={
            "inline-flex items-center rounded p-0.5 text-ink-500"
            + " hover:bg-paper-100 hover:text-ink-700 dark:hover:bg-walnut-100/40"
          }
        >
          <Pencil className="size-3.5" />
        </button>
        <ProjectHealthBadge health={health} />
        <span className="ml-auto font-mono text-[11px] text-ink-500">
          {project.initiatives.length} initiative
          {project.initiatives.length === 1 ? "" : "s"}
          {" · "}
          {taskCount} task{taskCount === 1 ? "" : "s"}
        </span>
      </header>
      <ColumnHeader />
      <ul className="flex flex-col">
        {initiatives.map((initiative) => (
          <InitiativeRow
            key={initiative.beat.id}
            beat={initiative.beat}
            taskCount={initiative.tasks.length}
            now={now}
            onOpenBeat={onOpenBeat}
          />
        ))}
        {directTasks.map((task) => (
          <InitiativeRow
            key={task.beat.id}
            beat={task.beat}
            taskCount={0}
            now={now}
            onOpenBeat={onOpenBeat}
          />
        ))}
      </ul>
    </section>
  );
}

const DUE_CLS: Record<DueTone, string> = {
  none: "text-ink-500/70",
  set: "text-ink-500 dark:text-paper-400",
  overdue: "font-semibold text-rust-700 dark:text-rust-400",
};

const PILL_CLS =
  "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold"
  + " uppercase tracking-wide text-paper-50";

/** Row background accent: milestone focus (moss) wins over do-focus (lake). */
function rowAccentClass(focused: boolean, doFocused: boolean): string {
  if (focused) {
    return "rounded-r bg-moss-100 shadow-[inset_3px_0_0_var(--color-moss-600)]"
      + " dark:bg-moss-700/15";
  }
  if (doFocused) {
    return "rounded-r bg-lake-100 shadow-[inset_3px_0_0_var(--color-lake-600)]"
      + " dark:bg-lake-700/15";
  }
  return "hover:bg-paper-100 dark:hover:bg-walnut-100/40";
}

/** Trailing cell: star (milestone), zap (do), else a hover chevron (clickable cue). */
function RowTrailing({ focused, doFocused }: { focused: boolean; doFocused: boolean }) {
  if (focused) {
    return (
      <Star className="size-3.5 justify-self-end fill-moss-600 text-moss-600 dark:fill-moss-400 dark:text-moss-400" />
    );
  }
  if (doFocused) {
    return (
      <Zap className="size-3.5 justify-self-end fill-lake-600 text-lake-600 dark:fill-lake-400 dark:text-lake-400" />
    );
  }
  return (
    <ChevronRight className="size-3.5 justify-self-end text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" />
  );
}

/** One initiative (or direct task) row: priority · title · status · tasks · due · flags. */
function InitiativeRow({
  beat,
  taskCount,
  now,
  onOpenBeat,
}: {
  beat: Beat;
  taskCount: number;
  now: number;
  onOpenBeat: (beat: Beat) => void;
}) {
  const focused = isFocusBeat(beat);
  const doFocused = isDoFocusBeat(beat);
  const due = dueState(beat.due, now);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenBeat(beat)}
        data-focus={focused ? "true" : undefined}
        data-do-focus={doFocused ? "true" : undefined}
        className={
          ROW_COLS + " group w-full cursor-pointer border-b border-paper-200"
          + " px-2 py-2 text-left dark:border-walnut-100/60 "
          + rowAccentClass(focused, doFocused)
        }
      >
        <BeatPriorityBadge priority={beat.priority} />
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink-800 dark:text-paper-200">
            {beat.title}
          </span>
          {focused && <span className={PILL_CLS + " bg-moss-600"}>★ Focus</span>}
          {doFocused && <span className={PILL_CLS + " bg-lake-600"}>⚡ Do</span>}
        </span>
        <BeatStateBadge state={beat.state} />
        <span className="text-right font-mono text-[11px] text-ink-500 dark:text-paper-400">
          {taskCount > 0 ? `${taskCount}` : ""}
        </span>
        <span
          data-due-tone={due.tone}
          className={`text-right font-mono text-[11px] ${DUE_CLS[due.tone]}`}
        >
          {due.tone === "none"
            ? "—"
            : (due.tone === "overdue" ? `⚠ ${due.label}` : due.label)}
        </span>
        <RowTrailing focused={focused} doFocused={doFocused} />
      </button>
    </li>
  );
}
