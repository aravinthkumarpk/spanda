import type { ReactNode } from "react";
import {
  CalendarDays, MoreHorizontal, ListMusic, LayoutDashboard,
  Inbox, Zap, RotateCcw, History, BarChart3, Columns3,
  FolderKanban, Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BeatsViewId } from "./app-header-hooks";

/**
 * The /beats view switcher (iteration 02, A5). Four primary surfaces — Today,
 * Board, Projects, Review — render as left-aligned tabs; the secondary views
 * collapse under a "More" menu so the bar stays legible instead of spilling
 * ten tabs. Today is a route (the daily change feed), so it links; the rest
 * switch the `view` query param.
 */

function ViewTab(props: {
  view: BeatsViewId;
  current: string;
  icon: ReactNode;
  label: string;
  title: string;
  setView: (v: BeatsViewId) => void;
  badge?: number;
}) {
  const {
    view, current, icon, label, title,
    setView, badge,
  } = props;
  return (
    <Button
      size="lg"
      variant={current === view ? "default" : "ghost"}
      className="h-8 gap-1.5 px-2.5"
      title={title}
      onClick={() => setView(view)}
    >
      {icon}
      {label}
      {badge != null && badge > 0 && (
        <Badge variant="secondary" className="ml-1">
          {badge > 9 ? "9+" : badge}
        </Badge>
      )}
    </Button>
  );
}

const MORE_TABS: {
  view: BeatsViewId;
  icon: ReactNode;
  label: string;
  title: string;
}[] = [
  { view: "setlist", icon: <ListMusic className="size-4" />, label: "Setlist",
    title: "Execution plans and gantt-style setlist" },
  { view: "overview", icon: <LayoutDashboard className="size-4" />,
    label: "Overview", title: "Task state overview" },
  { view: "queues", icon: <Inbox className="size-4" />, label: "Queues",
    title: "Queue tasks (ready for action)" },
  { view: "active", icon: <Zap className="size-4" />, label: "Active",
    title: "Active tasks (in progress)" },
  { view: "finalcut", icon: <Megaphone className="size-4" />,
    label: "Escalations", title: "Escalations — live agent approval requests" },
  { view: "retakes", icon: <RotateCcw className="size-4" />, label: "Regressions",
    title: "Regression tracking — reopened tasks" },
  { view: "history", icon: <History className="size-4" />, label: "History",
    title: "Agent run history" },
  { view: "diagnostics", icon: <BarChart3 className="size-4" />,
    label: "Diagnostics", title: "Runtime diagnostics and lease analytics" },
];

function TodayTabLink() {
  return (
    <a
      href="/today"
      title="Today — the change feed: what moved, to help you prioritise"
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5"
        + " text-sm font-medium text-foreground/80 hover:bg-muted"
      }
    >
      <CalendarDays className="size-4" />
      Today
    </a>
  );
}

function MoreTabsMenu(props: {
  setView: (v: BeatsViewId) => void;
  escalationsCount: number;
}) {
  const { setView, escalationsCount } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="lg"
          variant="ghost"
          className={cn(
            "h-8 gap-1.5 px-2.5",
            escalationsCount > 0 && "text-clay-700 dark:text-clay-100",
          )}
          title="More views"
        >
          <MoreHorizontal className="size-4" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MORE_TABS.map((t) => (
          <DropdownMenuItem
            key={t.view}
            onClick={() => setView(t.view)}
            title={t.title}
          >
            {t.icon}
            <span className="ml-2">{t.label}</span>
            {t.view === "finalcut" && escalationsCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {escalationsCount > 9 ? "9+" : escalationsCount}
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewSwitcherTabs(props: {
  beatsView: string;
  setView: (v: BeatsViewId) => void;
  escalationsCount: number;
}) {
  const {
    beatsView, setView, escalationsCount,
  } = props;
  return (
    <div className={
      "flex min-w-max shrink-0 items-center gap-1"
      + " rounded-lg border bg-muted/20 p-1"
    }>
      <TodayTabLink />
      <ViewTab
        view="board" current={beatsView}
        icon={<Columns3 className="size-4" />}
        label="Board"
        title="Normalized board — To do / Doing / Review / Done"
        setView={setView}
      />
      <ViewTab
        view="projects" current={beatsView}
        icon={<FolderKanban className="size-4" />}
        label="Projects"
        title="Projects — hierarchy and activity-based health"
        setView={setView}
      />
      <ViewTab
        view="review" current={beatsView}
        icon={<Megaphone className="size-4" />}
        label="Review"
        title="Review — the Plan-review & Execution-review gates that need you"
        setView={setView}
      />
      <MoreTabsMenu setView={setView} escalationsCount={escalationsCount} />
    </div>
  );
}
