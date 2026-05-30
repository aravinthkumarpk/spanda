/**
 * B3 (ADR-0003) — the plan document (`metadata.plan`) and live status
 * (`metadata.status`) round-trip through a beats update. The update schema
 * carries `metadata`, `applyUpdate` shallow-merges it, and the JSONL DTO
 * persists/reads it. This locks the "PATCH then GET" round-trip the skill pack
 * relies on.
 */

import { describe, expect, it } from "vitest";

import { applyUpdate } from "@/lib/backends/beads-backend-helpers";
import {
  denormalizeToJsonl,
  normalizeFromJsonl,
} from "@/lib/backends/beads-jsonl-dto";
import type { Beat } from "@/lib/types";

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "init.1",
    title: "Ship the thing",
    type: "work",
    state: "ready_for_planning",
    profileId: "semiauto",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("B3 — plan/status in metadata (ADR-0003)", () => {
  it("PATCH of metadata.plan + metadata.status round-trips via the DTO", () => {
    const beat = makeBeat();
    applyUpdate(beat, {
      metadata: { plan: "1. do x\n2. do y", status: "task 1 done" },
    });
    expect(beat.metadata).toMatchObject({
      plan: "1. do x\n2. do y",
      status: "task 1 done",
    });

    // Simulate the PATCH→GET cycle: serialize to JSONL and read it back.
    const roundTripped = normalizeFromJsonl(denormalizeToJsonl(beat));
    expect(roundTripped.metadata).toMatchObject({
      plan: "1. do x\n2. do y",
      status: "task 1 done",
    });
  });

  it("a partial metadata PATCH (status only) preserves an existing plan", () => {
    const beat = makeBeat({ metadata: { plan: "the plan" } });
    applyUpdate(beat, { metadata: { status: "executing task 2" } });
    expect(beat.metadata).toEqual({
      plan: "the plan",
      status: "executing task 2",
    });
  });

  it("leaves metadata untouched when an update omits it", () => {
    const beat = makeBeat({ metadata: { plan: "keep me" } });
    applyUpdate(beat, { notes: "unrelated edit" });
    expect(beat.metadata).toEqual({ plan: "keep me" });
  });
});
