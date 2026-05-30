"use client";

import type { Beat } from "@/lib/types";
import type { AgentInfo } from "@/components/beat-columns";
import { BeatTable } from "@/components/beat-table";
import { RepoSwitchLoadingState } from "@/components/repo-switch-loading-state";
import { StreamingProgressBar } from "@/components/streaming-progress-bar";
import {
  AllReposEmptyState,
  DegradedBanner,
  StreamingEmptyState,
} from "./beats-empty-states";
import type { StreamingProgress } from "./use-streaming-progress";

/**
 * The list/table beats view (queues / active / search), extracted from
 * page.tsx so that page stays under the per-file line cap. Pure presentation
 * over the passed beats + streaming progress.
 */
export interface BeatsListContentProps {
  isLoading: boolean;
  loadError: string | null;
  isDegradedError: boolean;
  beats: Beat[];
  showRepoColumn: boolean;
  isQueuedView: boolean;
  isActiveView: boolean;
  agentInfoByBeatId: Record<string, AgentInfo>;
  onSelectionChange: (ids: string[]) => void;
  selectionVersion: number;
  searchQuery: string;
  onOpenBeat: (beat: Beat) => void;
  onShipBeat: (beat: Beat) => Promise<void>;
  shippingByBeatId: Record<string, string>;
  onAbortShipping: (beatId: string) => Promise<void>;
  streamingProgress: StreamingProgress;
}

export function BeatsListContent(props: BeatsListContentProps) {
  const {
    isLoading, loadError, isDegradedError,
    beats, showRepoColumn, isQueuedView, isActiveView,
    agentInfoByBeatId, onSelectionChange,
    selectionVersion, searchQuery,
    onOpenBeat, onShipBeat,
    shippingByBeatId, onAbortShipping,
    streamingProgress,
  } = props;

  const isStreamActive =
    streamingProgress.isStreaming
    || (streamingProgress.isComplete
      && streamingProgress.totalRepos > 0);

  if (isLoading && !isStreamActive) {
    return (
      <RepoSwitchLoadingState
        data-testid="repo-switch-loading-beats"
        label="Loading beats..."
      />
    );
  }
  if (loadError && !isDegradedError) {
    return (
      <div className={
        "flex items-center justify-center"
        + " py-6 text-sm text-destructive"
      }>
        Failed to load beats: {loadError}
      </div>
    );
  }

  const streamingEmpty =
    streamingProgress.isStreaming
    && beats.length === 0;
  const allReposEmpty =
    streamingProgress.isComplete
    && streamingProgress.totalRepos > 0
    && beats.length === 0;

  return (
    <div className="overflow-x-auto">
      {isDegradedError && (
        <DegradedBanner message={loadError} />
      )}
      {isStreamActive && (
        <StreamingProgressBar
          progress={streamingProgress}
        />
      )}
      {streamingEmpty ? (
        <StreamingEmptyState />
      ) : allReposEmpty ? (
        <AllReposEmptyState />
      ) : (
        <BeatTable
          data={beats}
          showRepoColumn={showRepoColumn}
          showAgentColumns={isActiveView}
          sortTopLevelByPriorityUpdated={
            isQueuedView && !searchQuery
          }
          agentInfoByBeatId={agentInfoByBeatId}
          onSelectionChange={onSelectionChange}
          selectionVersion={selectionVersion}
          searchQuery={searchQuery}
          onOpenBeat={onOpenBeat}
          onShipBeat={onShipBeat}
          shippingByBeatId={shippingByBeatId}
          onAbortShipping={onAbortShipping}
          isStreaming={
            streamingProgress.isStreaming
          }
        />
      )}
    </div>
  );
}
