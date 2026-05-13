import {
  staleBeatTargetKey,
} from "@/lib/stale-beat-grooming";
import type {
  StaleBeatGroomingResult,
  StaleBeatGroomingReviewRecord,
  StaleBeatGroomingFailureLog,
  StaleBeatReviewTarget,
} from "@/lib/stale-beat-grooming-types";

type ReviewInput = StaleBeatReviewTarget & {
  jobId: string;
  agentId: string;
};

const g = globalThis as typeof globalThis & {
  __staleBeatGroomingReviews?: Map<
    string,
    StaleBeatGroomingReviewRecord
  >;
};

function reviewState(): Map<string, StaleBeatGroomingReviewRecord> {
  if (!g.__staleBeatGroomingReviews) {
    g.__staleBeatGroomingReviews = new Map();
  }
  return g.__staleBeatGroomingReviews;
}

export function listStaleBeatGroomingReviews():
  StaleBeatGroomingReviewRecord[] {
  return [...reviewState().values()].sort(
    (left, right) => right.queuedAt - left.queuedAt,
  );
}

export function recordStaleBeatGroomingQueued(
  input: ReviewInput,
): StaleBeatGroomingReviewRecord {
  const key = staleBeatTargetKey(input);
  const record: StaleBeatGroomingReviewRecord = {
    key,
    jobId: input.jobId,
    beatId: input.beatId,
    status: "queued",
    queuedAt: Date.now(),
    agentId: input.agentId,
    ...(input.repoPath ? { repoPath: input.repoPath } : {}),
  };
  reviewState().set(key, record);
  return record;
}

export function recordStaleBeatGroomingRunning(
  target: StaleBeatReviewTarget,
): void {
  updateReview(target, {
    status: "running",
    startedAt: Date.now(),
    error: undefined,
  });
}

export function recordStaleBeatGroomingCompleted(
  target: StaleBeatReviewTarget,
  result: StaleBeatGroomingResult,
): void {
  updateReview(target, {
    status: "completed",
    completedAt: Date.now(),
    result,
    error: undefined,
  });
}

export function recordStaleBeatGroomingFailed(
  target: StaleBeatReviewTarget,
  error: string,
  failureLog?: StaleBeatGroomingFailureLog,
): void {
  updateReview(target, {
    status: "failed",
    completedAt: Date.now(),
    error,
    ...(failureLog ? { failureLog } : {}),
  });
}

export function clearStaleBeatGroomingReviews(): void {
  reviewState().clear();
}

function updateReview(
  target: StaleBeatReviewTarget,
  patch: Partial<StaleBeatGroomingReviewRecord>,
): void {
  const key = staleBeatTargetKey(target);
  const current = reviewState().get(key);
  if (!current) return;
  reviewState().set(key, {
    ...current,
    ...patch,
  });
}
