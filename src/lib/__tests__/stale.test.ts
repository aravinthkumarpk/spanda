/**
 * stale — canonical pure version of the shipped StaleBadge rule.
 *
 * Ports the exact shipped boundary + fail-soft behaviour from
 * `src/components/stale-badge.tsx`:
 *   - STRICT greater-than threshold (exactly N days = NOT stale).
 *   - Default threshold 7 days.
 *   - Fail-soft: null / undefined / malformed timestamp -> not stale.
 *
 * Hermetic: `now` is injected as a number; no wall-clock reads.
 */

import { describe, expect, it } from "vitest";
import { isStale, staleAgeDays } from "@/lib/stale";

const NOW = new Date("2026-05-24T18:00:00Z").getTime();
const day = 86_400_000;

function ago(days: number): string {
  return new Date(NOW - days * day).toISOString();
}

describe("isStale", () => {
  it("is stale when updated 8 days ago (default 7-day threshold)", () => {
    expect(isStale(ago(8), NOW)).toBe(true);
  });

  it("is stale when updated 30 days ago", () => {
    expect(isStale(ago(30), NOW)).toBe(true);
  });

  it("is NOT stale when updated 3 days ago (< threshold)", () => {
    expect(isStale(ago(3), NOW)).toBe(false);
  });

  it("is NOT stale exactly at the 7-day boundary (strict greater-than)", () => {
    expect(isStale(ago(7), NOW)).toBe(false);
  });

  it("is stale just past the 7-day boundary", () => {
    expect(isStale(ago(8), NOW)).toBe(true);
  });

  it("fail-soft: null updated -> not stale", () => {
    expect(isStale(null, NOW)).toBe(false);
  });

  it("fail-soft: undefined updated -> not stale", () => {
    expect(isStale(undefined, NOW)).toBe(false);
  });

  it("fail-soft: malformed updated -> not stale", () => {
    expect(isStale("not-a-date", NOW)).toBe(false);
  });

  it("respects a custom threshold: 5 days with threshold 3 -> stale", () => {
    expect(isStale(ago(5), NOW, 3)).toBe(true);
  });

  it("respects a custom threshold: exactly 3 days with threshold 3 -> NOT stale", () => {
    expect(isStale(ago(3), NOW, 3)).toBe(false);
  });

  it("treats a 'just now' timestamp as not stale", () => {
    expect(isStale(new Date(NOW).toISOString(), NOW)).toBe(false);
  });
});

describe("staleAgeDays", () => {
  it("floors the age in whole days", () => {
    expect(staleAgeDays(ago(8), NOW)).toBe(8);
  });

  it("floors a partial day down", () => {
    const updated = new Date(NOW - (8 * day + 12 * 3_600_000)).toISOString();
    expect(staleAgeDays(updated, NOW)).toBe(8);
  });

  it("returns 0 for a 'just now' timestamp", () => {
    expect(staleAgeDays(new Date(NOW).toISOString(), NOW)).toBe(0);
  });

  it("returns null for null", () => {
    expect(staleAgeDays(null, NOW)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(staleAgeDays(undefined, NOW)).toBeNull();
  });

  it("returns null for a malformed timestamp", () => {
    expect(staleAgeDays("not-a-date", NOW)).toBeNull();
  });
});
