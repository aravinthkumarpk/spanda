"use client";

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
import { ProjectHealthBadge } from "@/components/project-health-badge";
import { BeatStateBadge } from "@/components/beat-state-badge";
import { displayBeatLabel } from "@/lib/beat-display";

/**
 * Altitude-3 Projects view (C1 + C2). Reads the native parent hierarchy
 * (Project -> Initiative -> Task) via groupIntoProjectTree over the beats
 * already fetched through BackendPort — no second store. Each project shows
 * its activity-based health (classifyProjectHealth, Q7: zero new fields), the
 * loom-derived terminal/actionable signals coming from each child's own
 * descriptor. A "now" snapshot is taken once at mount so the render stays pure.
 */
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
  const tree = useMemo(() => groupIntoProjectTree(beats), [beats]);
  const projects = useMemo(
    () =>
      tree.unsorted.tasks.length > 0
        ? [...tree.projects, tree.unsorted]
        : tree.projects,
    [tree],
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          now={now}
          onOpenBeat={onOpenBeat}
        />
      ))}
    </div>
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

function ProjectCard({
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
  const initiativeCount = project.initiatives.length;
  const taskCount = project.tasks.length
    + project.initiatives.reduce((sum, i) => sum + i.tasks.length, 0);

  return (
    <section
      className={
        "flex flex-col gap-2 rounded-xl border border-paper-200"
        + " bg-paper-50 p-3.5 dark:border-walnut-100 dark:bg-walnut-100/40"
      }
    >
      <header className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenBeat(project.beat)}
          title={project.title}
          className={
            "text-left text-sm font-semibold leading-snug text-ink-900"
            + " hover:text-lake-700 dark:text-paper-100"
          }
        >
          <span className="line-clamp-2">{project.title}</span>
        </button>
        <ProjectHealthBadge health={health} />
      </header>
      <p className="text-xs text-ink-500">
        {initiativeCount} initiative{initiativeCount === 1 ? "" : "s"}
        {" · "}
        {taskCount} task{taskCount === 1 ? "" : "s"}
      </p>
      {children.length > 0 && (
        <ul className="flex flex-col gap-1">
          {children.slice(0, 6).map((beat) => (
            <li key={beat.id}>
              <button
                type="button"
                onClick={() => onOpenBeat(beat)}
                className={
                  "flex w-full items-center gap-1.5 rounded px-1 py-0.5"
                  + " text-left text-xs hover:bg-paper-100"
                  + " dark:hover:bg-walnut-100/40"
                }
              >
                <BeatStateBadge state={beat.state} />
                <span className="truncate text-ink-700 dark:text-paper-300">
                  {beat.title}
                </span>
                <span className="ml-auto font-mono text-[10px] text-ink-400">
                  {displayBeatLabel(beat.id, beat.aliases)}
                </span>
              </button>
            </li>
          ))}
          {children.length > 6 && (
            <li className="px-1 text-[11px] text-ink-400">
              +{children.length - 6} more
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
