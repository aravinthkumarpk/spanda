"use client";

import {
  useCallback, useEffect, useRef, useState,
} from "react";
import type {
  Dispatch, RefObject, SetStateAction,
} from "react";
import type { AppUpdateStatus } from "@/lib/app-update-types";

export const VERSION_UPDATE_COMMAND =
  "foolery update && foolery restart";

const POLL_INTERVAL_MS = 1500;
export const UPDATE_COMPLETE_RELOAD_DELAY_MS = 4000;

type TimeoutHandle = ReturnType<typeof setTimeout>;
type TimeoutScheduler = (
  callback: () => void,
  delay: number,
) => TimeoutHandle;
type IntervalRef = RefObject<
  ReturnType<typeof setInterval> | null
>;
type TimeoutRef = RefObject<TimeoutHandle | null>;
type StatusSetter = Dispatch<SetStateAction<AppUpdateStatus>>;

export function scheduleUpdateCompleteReload(
  reload: () => void = () => {
    window.location.reload();
  },
  setTimeoutImpl: TimeoutScheduler = setTimeout,
): TimeoutHandle {
  return setTimeoutImpl(
    reload,
    UPDATE_COMPLETE_RELOAD_DELAY_MS,
  );
}

export function idleUpdateStatus(): AppUpdateStatus {
  return {
    phase: "idle",
    message: null,
    error: null,
    startedAt: null,
    endedAt: null,
    workerPid: null,
    launcherPath: null,
    fallbackCommand: VERSION_UPDATE_COMMAND,
  };
}

async function requestStatus(
  url: string,
  init: RequestInit | undefined,
  fetchImpl: typeof fetch,
): Promise<AppUpdateStatus | null> {
  try {
    const res = await fetchImpl(url, init);
    const json = (await res.json()) as {
      data?: AppUpdateStatus;
      error?: string;
    };
    if (!json.data) {
      if (!res.ok && json.error) {
        return {
          ...idleUpdateStatus(),
          phase: "failed",
          message: "Automatic update failed",
          error: json.error,
          endedAt: Date.now(),
        };
      }
      return null;
    }
    return json.data;
  } catch {
    return null;
  }
}

export function readVersionUpdateStatus(
  fetchImpl: typeof fetch = fetch,
): Promise<AppUpdateStatus | null> {
  return requestStatus(
    "/api/app-update",
    { method: "GET" },
    fetchImpl,
  );
}

export function triggerVersionUpdate(
  fetchImpl: typeof fetch = fetch,
): Promise<AppUpdateStatus | null> {
  return requestStatus(
    "/api/app-update",
    { method: "POST" },
    fetchImpl,
  );
}

function isBusyPhase(
  phase: AppUpdateStatus["phase"],
): boolean {
  return (
    phase === "starting" ||
    phase === "updating" ||
    phase === "restarting"
  );
}

function isBusy(status: AppUpdateStatus): boolean {
  return isBusyPhase(status.phase);
}

function shouldAutoReloadCompletedPhase(
  phase: AppUpdateStatus["phase"],
  observedActiveUpdate: boolean,
  hasPendingReload: boolean,
): boolean {
  return (
    phase === "completed" &&
    observedActiveUpdate &&
    !hasPendingReload
  );
}

function startingUpdateStatus(): AppUpdateStatus {
  return {
    ...idleUpdateStatus(),
    phase: "starting",
    message: "Launching update worker",
    startedAt: Date.now(),
  };
}

function clearPollTimer(pollTimerRef: IntervalRef): void {
  if (pollTimerRef.current) {
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
  }
}

function clearReloadTimer(reloadTimerRef: TimeoutRef): void {
  if (reloadTimerRef.current) {
    clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = null;
  }
}

function useVersionUpdateCleanup(
  pollTimerRef: IntervalRef,
  reloadTimerRef: TimeoutRef,
): void {
  useEffect(() => () => {
    clearPollTimer(pollTimerRef);
    clearReloadTimer(reloadTimerRef);
  }, [pollTimerRef, reloadTimerRef]);
}

function usePersistedVersionUpdateStatus(
  setStatus: StatusSetter,
): void {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const next = await readVersionUpdateStatus();
      if (!cancelled && next) {
        setStatus(next);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [setStatus]);
}

export function shouldAutoReloadCompletedUpdate(
  status: AppUpdateStatus,
  observedActiveUpdate: boolean,
  hasPendingReload: boolean,
): boolean {
  return shouldAutoReloadCompletedPhase(
    status.phase,
    observedActiveUpdate,
    hasPendingReload,
  );
}

export function useVersionUpdateAction() {
  const [status, setStatus] = useState<AppUpdateStatus>(
    idleUpdateStatus(),
  );
  const pollTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);
  const reloadTimerRef =
    useRef<TimeoutHandle | null>(null);
  const shouldReloadOnCompletionRef = useRef(false);
  const updatePhase = status.phase;

  useVersionUpdateCleanup(pollTimerRef, reloadTimerRef);

  const refresh = useCallback(async () => {
    const next = await readVersionUpdateStatus();
    if (next) {
      setStatus(next);
    }
    return next;
  }, []);

  usePersistedVersionUpdateStatus(setStatus);

  useEffect(() => {
    if (!isBusy(status)) {
      clearPollTimer(pollTimerRef);
      return;
    }

    clearPollTimer(pollTimerRef);
    pollTimerRef.current = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      clearPollTimer(pollTimerRef);
    };
  }, [pollTimerRef, refresh, status]);

  useEffect(() => {
    if (isBusyPhase(updatePhase)) {
      shouldReloadOnCompletionRef.current = true;
    }

    if (updatePhase !== "completed") {
      clearReloadTimer(reloadTimerRef);
      return;
    }

    if (shouldAutoReloadCompletedPhase(
      updatePhase,
      shouldReloadOnCompletionRef.current,
      Boolean(reloadTimerRef.current),
    )) {
      reloadTimerRef.current = scheduleUpdateCompleteReload();
    }
  }, [reloadTimerRef, updatePhase]);

  const startUpdate = useCallback(async () => {
    shouldReloadOnCompletionRef.current = true;
    setStatus(startingUpdateStatus());
    const next = await triggerVersionUpdate();
    if (!next) {
      setStatus({
        ...idleUpdateStatus(),
        phase: "failed",
        message: "Automatic update failed",
        error: "Failed to reach update API.",
        endedAt: Date.now(),
      });
      return false;
    }

    setStatus(next);
    return next.phase !== "failed";
  }, []);

  return {
    status,
    triggerUpdate: startUpdate,
  } as const;
}
