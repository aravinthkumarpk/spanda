import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStaleBeatGroomingWorkerHealth,
  recordStaleBeatGroomingAgentDetails,
  recordStaleBeatGroomingPickup,
  recordStaleBeatGroomingProgress,
  recordStaleBeatGroomingRelease,
  recordStaleBeatGroomingWorkerStarted,
  resetStaleBeatGroomingWorkerState,
} from "@/lib/stale-beat-grooming-worker-state";

const baseJob = {
  id: "job-1",
  beatId: "beat-1",
  agentId: "codex",
  createdAt: 0,
};

describe("stale-beat-grooming worker state diagnostics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T10:00:00.000Z"));
    resetStaleBeatGroomingWorkerState();
    recordStaleBeatGroomingWorkerStarted();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetStaleBeatGroomingWorkerState();
  });

  it("surfaces only the active job startedAt before agent details arrive", () => {
    recordStaleBeatGroomingPickup(0, baseJob);

    const [activeJob] = getStaleBeatGroomingWorkerHealth().activeJobs;
    expect(activeJob).toMatchObject({
      jobId: "job-1",
      beatId: "beat-1",
      agentId: "codex",
    });
    expect(activeJob?.agentName).toBeUndefined();
    expect(activeJob?.agentVersion).toBeUndefined();
    expect(activeJob?.lastOutputAt).toBeUndefined();
  });

  it("records agent name and version once resolved", () => {
    recordStaleBeatGroomingPickup(0, baseJob);

    recordStaleBeatGroomingAgentDetails("job-1", {
      agentName: "Codex",
      agentVersion: "gpt-5.4",
    });

    const [activeJob] = getStaleBeatGroomingWorkerHealth().activeJobs;
    expect(activeJob?.agentName).toBe("Codex");
    expect(activeJob?.agentVersion).toBe("gpt-5.4");
  });

  it("preserves prior agent details when the next update omits a field", () => {
    recordStaleBeatGroomingPickup(0, baseJob);
    recordStaleBeatGroomingAgentDetails("job-1", {
      agentName: "Codex",
      agentVersion: "gpt-5.4",
    });

    recordStaleBeatGroomingAgentDetails("job-1", { agentName: "Codex 2" });

    const [activeJob] = getStaleBeatGroomingWorkerHealth().activeJobs;
    expect(activeJob?.agentName).toBe("Codex 2");
    expect(activeJob?.agentVersion).toBe("gpt-5.4");
  });

  it("ignores progress and agent updates for unknown job ids", () => {
    recordStaleBeatGroomingPickup(0, baseJob);

    recordStaleBeatGroomingAgentDetails("missing", { agentName: "Ghost" });
    recordStaleBeatGroomingProgress("missing", Date.now());

    const [activeJob] = getStaleBeatGroomingWorkerHealth().activeJobs;
    expect(activeJob?.agentName).toBeUndefined();
    expect(activeJob?.lastOutputAt).toBeUndefined();
  });

  it("records progress timestamps so callers can detect hung sessions", () => {
    recordStaleBeatGroomingPickup(0, baseJob);
    const stamp = Date.now() + 5_000;

    recordStaleBeatGroomingProgress("job-1", stamp);

    const [activeJob] = getStaleBeatGroomingWorkerHealth().activeJobs;
    expect(activeJob?.lastOutputAt).toBe(stamp);
  });

  it("drops diagnostics when the job is released", () => {
    recordStaleBeatGroomingPickup(0, baseJob);
    recordStaleBeatGroomingAgentDetails("job-1", { agentName: "Codex" });
    recordStaleBeatGroomingProgress("job-1", Date.now());

    recordStaleBeatGroomingRelease(0);

    expect(getStaleBeatGroomingWorkerHealth().activeJobs).toEqual([]);
  });
});
