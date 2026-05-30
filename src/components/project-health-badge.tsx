import type { ProjectHealth } from "@/lib/project-health";

/**
 * Small badge for a project's activity-based health (Q7). Health is derived
 * purely from child-task movement by classifyProjectHealth — this component is
 * presentation only (CLAUDE.md exception 2: state -> color theming).
 */
const HEALTH_STYLE: Record<ProjectHealth, { label: string; cls: string }> = {
  moving: {
    label: "Moving",
    cls: "bg-moss-100 text-moss-700 dark:bg-moss-700 dark:text-moss-100",
  },
  stalled: {
    label: "Stalled",
    cls: "bg-ochre-100 text-ochre-700 dark:bg-ochre-700 dark:text-ochre-100",
  },
  blocked: {
    label: "Blocked",
    cls: "bg-rust-100 text-rust-700 dark:bg-rust-700 dark:text-rust-100",
  },
  done: {
    label: "Done",
    cls: "bg-paper-200 text-ink-700 dark:bg-walnut-100 dark:text-paper-200",
  },
  empty: {
    label: "Empty",
    cls: "bg-paper-200 text-ink-500 dark:bg-walnut-100 dark:text-paper-400",
  },
};

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  const style = HEALTH_STYLE[health];
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[11px] font-semibold"
        + ` uppercase tracking-wide ${style.cls}`
      }
    >
      {style.label}
    </span>
  );
}
