"use client";

import { Suspense } from "react";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Beat } from "@/lib/types";
import {
  BeatDetailLightbox,
} from "@/components/beat-detail-lightbox";
import {
  FilterBar, type ViewPhase,
} from "@/components/filter-bar";
import {
  MergeBeatsDialog,
} from "@/components/merge-beats-dialog";
import { FinalCutView } from "@/components/final-cut-view";
import { RetakesView } from "@/components/retakes-view";
import {
  AgentHistoryView,
} from "@/components/agent-history-view";
import {
  DiagnosticsView,
} from "@/components/lease-audit-view";
import { SetlistView } from "@/components/setlist-view";
import {
  BeatStateOverviewScreen,
} from "@/components/beat-state-overview";
import { ScopedBoardView } from "./scoped-board-view";
import { ProjectsView } from "@/components/projects-view";
import { ArtifactsView } from "@/components/artifacts-view";
import { ReviewQueueView } from "@/components/review-queue-view";
import { BeatsListContent } from "./beats-list-content";
import { LabelFilterChips } from "@/components/label-filter-chips";
import { useLabelFilter } from "./use-label-filter";
import { useActiveFilter } from "./use-active-filter";
import { useUpdateUrl } from "@/hooks/use-update-url";
import { useAppStore } from "@/stores/app-store";
import { useTerminalStore } from "@/stores/terminal-store";
import {
  isListBeatsView, parseBeatsView,
} from "@/lib/beats-view";
import { useBeatsQuery } from "./use-beats-query";
import { useAgentInfoMap } from "./use-agent-info-map";
import {
  useTerminalAgentInfoMap,
} from "./use-terminal-agent-info";
import {
  buildOverviewLeaseInfoByBeatKey,
} from "./overview-lease-info";
import {
  applyPendingBeatReleases,
  settledPendingBeatReleaseKeys,
} from "@/lib/beat-release-optimism";
import { useBulkActions } from "./use-bulk-actions";
import { useBeatActions } from "./use-beat-actions";
import { useBeatDetail } from "./use-beat-detail";
import { useBeatsScreenWarmup } from "@/hooks/use-beats-screen-warmup";
import { useReleasePendingStore } from "@/stores/release-pending-store";

export default function BeatsPage() {
  return (
    <Suspense fallback={
      <div className={
        "flex items-center justify-center"
        + " py-6 text-muted-foreground"
      }>
        Loading beats...
      </div>
    }>
      <BeatsPageInner />
    </Suspense>
  );
}

function useBeatsPageState() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const detailBeatId = searchParams.get("beat");
  const detailRepo = searchParams.get("detailRepo") ?? undefined;
  const beatsView = parseBeatsView(searchParams.get("view"));
  const isListView = isListBeatsView(beatsView);
  const isOverviewView = beatsView === "overview";
  const isBoardView = beatsView === "board";
  const isProjectsView = beatsView === "projects";
  const isArtifactsView = beatsView === "artifacts";
  const isReviewView = beatsView === "review";
  const shouldLoadBeats =
    isListView || isOverviewView || isBoardView || isProjectsView
    || isReviewView || isArtifactsView;
  const supportsBeatDetail = shouldLoadBeats || beatsView === "setlist";
  const viewPhase: ViewPhase = beatsView === "active" ? "active" : "queues";
  const isActiveView = beatsView === "active";
  const { activeRepo, registeredRepos } = useAppStore();
  const {
    terminals, setActiveSession,
  } = useTerminalStore();

  const shippingByBeatId = terminals.reduce<
    Record<string, string>
  >((acc, t) => {
    if (t.status === "running") {
      acc[t.beatId] = t.sessionId;
    }
    return acc;
  }, {});
  const activeBeatIds = useMemo(() => {
    const beatIds = new Set<string>();

    for (const terminal of terminals) {
      if (terminal.status !== "running") {
        continue;
      }
      beatIds.add(terminal.beatId);
      for (const beatId of terminal.beatIds ?? []) {
        beatIds.add(beatId);
      }
    }

    return beatIds;
  }, [terminals]);

  const {
    beats, isLoading, loadError,
    isDegradedError, hasRollingAncestor,
    streamingProgress,
  } = useBeatsQuery({
    beatsView, searchQuery, shouldLoadBeats, activeRepo,
    registeredRepos, shippingByBeatId,
  });
  const displayedBeats = useDisplayedBeats(beats);
  const { selectedLabels, labelFilteredBeats } = useLabelFilter(
    useActiveFilter(displayedBeats),
    searchParams.get("labels"),
  );
  const showRepoColumn =
    !activeRepo && registeredRepos.length > 1;
  const agentInfoByBeatId = useAgentInfoMap(
    isActiveView, displayedBeats, terminals,
  );
  const terminalAgentInfoMap = useTerminalAgentInfoMap();
  const overviewLeaseInfoByBeatKey = useMemo(
    () => buildOverviewLeaseInfoByBeatKey(
      terminals,
      terminalAgentInfoMap,
    ),
    [terminals, terminalAgentInfoMap],
  );
  const bulk = useBulkActions(displayedBeats);
  const actions = useBeatActions(
    displayedBeats, terminals,
    shippingByBeatId, hasRollingAncestor,
    activeRepo ?? undefined,
  );
  const detail = useBeatDetail({
    beats: displayedBeats,
    detailBeatId,
    detailRepo,
    isListView: supportsBeatDetail,
    activeRepo,
  });
  return {
    beatsView, isListView, isOverviewView, isBoardView, isProjectsView,
    isArtifactsView, isReviewView,
    viewPhase,
    supportsBeatDetail,
    isActiveView, activeRepo,
    searchQuery, detailBeatId, detailRepo,
    beats: labelFilteredBeats, labelSourceBeats: displayedBeats, selectedLabels,
    isLoading, loadError, isDegradedError,
    hasRollingAncestor, showRepoColumn,
    agentInfoByBeatId, shippingByBeatId,
    overviewLeaseInfoByBeatKey,
    setActiveSession,
    activeBeatIds,
    streamingProgress,
    ...bulk, ...actions, ...detail,
  };
}

function useDisplayedBeats(beats: Beat[]): Beat[] {
  const pendingReleases = useReleasePendingStore(
    (s) => s.pendingReleases,
  );
  const clearPendingRelease = useReleasePendingStore(
    (s) => s.clearPendingRelease,
  );
  useEffect(() => {
    const settledKeys = settledPendingBeatReleaseKeys(
      beats,
      pendingReleases,
    );
    for (const key of settledKeys) {
      clearPendingRelease(key);
    }
  }, [beats, clearPendingRelease, pendingReleases]);
  return useMemo(
    () => applyPendingBeatReleases(beats, pendingReleases),
    [beats, pendingReleases],
  );
}

function BeatsPageInner() {
  const s = useBeatsPageState();
  const updateUrl = useUpdateUrl();
  const isFinalCutView = s.beatsView === "finalcut";
  const isSetlistView = s.beatsView === "setlist";
  const isRetakesView = s.beatsView === "retakes";
  const isHistoryView = s.beatsView === "history";
  const isOverviewView = s.beatsView === "overview";
  const isDiagnosticsView = s.beatsView === "diagnostics";
  const warmupView = s.isListView
    && (s.beatsView === "queues" || s.beatsView === "active")
    ? s.beatsView
    : null;
  useBeatsScreenWarmup(
    warmupView,
    !s.isLoading && !s.loadError,
  );

  return (
    <div className={
      "mx-auto max-w-[95vw]"
      + " overflow-x-hidden px-4 pt-2"
    }
    data-testid="beats-page">
      {s.isListView && (
        <div className={
          "mb-2 flex h-10 items-center"
          + " border-b border-border/60 pb-2"
        }
        data-testid="beats-filter-shell">
          <FilterBar
            viewPhase={s.viewPhase}
            selectedIds={s.selectedIds}
            onBulkUpdate={s.handleBulkUpdate}
            onClearSelection={s.handleClearSelection}
            onSceneBeats={s.handleSceneBeats}
            onMergeBeats={s.handleMergeBeats}
            onRefineScope={s.handleRefineScope}
          />
        </div>
      )}
      {s.isListView && s.labelSourceBeats.length > 0 && (
        <div className="mb-2 pb-1" data-testid="label-filter-chips">
          <LabelFilterChips
            beats={s.labelSourceBeats}
            selected={s.selectedLabels}
            onToggle={(label) =>
              updateUrl({
                labels: s.selectedLabels.includes(label)
                  ? s.selectedLabels.filter((l) => l !== label)
                  : [...s.selectedLabels, label],
              })
            }
            onClear={() => updateUrl({ labels: [] })}
          />
        </div>
      )}
      <BeatsViewBody
        isSetlistView={isSetlistView}
        isFinalCutView={isFinalCutView}
        isRetakesView={isRetakesView}
        isHistoryView={isHistoryView}
        isOverviewView={isOverviewView}
        isBoardView={s.isBoardView}
        isProjectsView={s.isProjectsView} isArtifactsView={s.isArtifactsView}
        isReviewView={s.isReviewView}
        isDiagnosticsView={isDiagnosticsView}
        state={s}
      />
      {s.supportsBeatDetail && (
        <BeatDetailLightbox
          key={`${s.detailBeatId ?? "none"}:${
            s.detailRepo ?? "none"
          }`}
          open={Boolean(s.detailBeatId)}
          beatId={s.detailBeatId}
          repo={s.detailRepo}
          initialBeat={s.initialDetailBeat}
          onOpenChange={
            s.handleBeatLightboxOpenChange
          }
          onMoved={s.handleMovedBeat}
          onShipBeat={s.handleShipBeat}
          isParentRollingBeat={
            s.hasRollingAncestor
          }
        />
      )}
      {s.isListView && (
        <MergeBeatsDialog
          open={s.mergeDialogOpen}
          onOpenChange={s.setMergeDialogOpen}
          beats={s.beats.filter(
            (b) => s.mergeBeatIds.includes(b.id),
          )}
          onMerged={s.handleClearSelection}
        />
      )}
    </div>
  );
}

type PageState = ReturnType<typeof useBeatsPageState>;

interface BeatsViewBodyProps {
  isSetlistView: boolean;
  isFinalCutView: boolean;
  isRetakesView: boolean;
  isHistoryView: boolean;
  isOverviewView: boolean;
  isBoardView: boolean;
  isProjectsView: boolean;
  isArtifactsView: boolean;
  isReviewView: boolean;
  isDiagnosticsView: boolean;
  state: PageState;
}

function BeatsViewBody({
  isSetlistView,
  isFinalCutView, isRetakesView,
  isHistoryView,
  isOverviewView,
  isBoardView,
  isProjectsView,
  isArtifactsView,
  isReviewView,
  isDiagnosticsView,
  state: s,
}: BeatsViewBodyProps) {
  return (
    <div className="mt-0.5">
      {isSetlistView ? (
        <SetlistView
          repoPath={s.activeRepo ?? undefined}
          activeBeatIds={s.activeBeatIds}
        />
      ) : isFinalCutView ? (
        <FinalCutView />
      ) : isRetakesView ? (
        <RetakesView />
      ) : isHistoryView ? (
        <AgentHistoryView />
      ) : isOverviewView ? (
        <BeatStateOverviewScreen
          isLoading={s.isLoading}
          loadError={s.loadError}
          isDegradedError={s.isDegradedError}
          beats={s.beats}
          showRepoColumn={s.showRepoColumn}
          isAllRepositories={!s.activeRepo}
          leaseInfoByBeatKey={s.overviewLeaseInfoByBeatKey}
          onOpenBeat={s.handleOpenBeat}
          onFocusLeaseSession={s.setActiveSession}
          onReleaseBeat={s.handleReleaseBeat}
          streamingProgress={s.streamingProgress}
        />
      ) : isArtifactsView ? (
        <ArtifactsView
          beats={s.beats}
          isLoading={s.isLoading}
        />
      ) : isBoardView ? (
        <ScopedBoardView
          isLoading={s.isLoading}
          loadError={s.loadError}
          beats={s.beats}
          onOpenBeat={s.handleOpenBeat}
          onShipBeat={s.handleShipBeat}
          shippingByBeatId={s.shippingByBeatId}
        />
      ) : isProjectsView ? (
        <ProjectsView
          isLoading={s.isLoading}
          loadError={s.loadError}
          beats={s.beats}
          onOpenBeat={s.handleOpenBeat}
        />
      ) : isReviewView ? (
        <ReviewQueueView
          isLoading={s.isLoading}
          loadError={s.loadError}
          beats={s.beats}
          onOpenBeat={s.handleOpenBeat}
        />
      ) : isDiagnosticsView ? (
        <DiagnosticsView
          repoPath={s.activeRepo ?? undefined}
        />
      ) : (
        <BeatsListContent
          isLoading={s.isLoading}
          loadError={s.loadError}
          isDegradedError={s.isDegradedError}
          beats={s.beats}
          showRepoColumn={s.showRepoColumn}
          isQueuedView={s.beatsView === "queues"}
          isActiveView={s.isActiveView}
          agentInfoByBeatId={s.agentInfoByBeatId}
          onSelectionChange={s.handleSelectionChange}
          selectionVersion={s.selectionVersion}
          searchQuery={s.searchQuery}
          onOpenBeat={s.handleOpenBeat}
          onShipBeat={s.handleShipBeat}
          shippingByBeatId={s.shippingByBeatId}
          onAbortShipping={s.handleAbortShipping}
          streamingProgress={s.streamingProgress}
        />
      )}
    </div>
  );
}


