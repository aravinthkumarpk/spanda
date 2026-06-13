/**
 * Feature gate (MVP lean cut): which OPTIONAL chrome renders. Evidence-based
 * — the disabled set is everything the user never raised across the whole
 * project history (terminal/dispatch UI, approvals, settings, repo switcher,
 * create button, /registry). Search stays; the per-beat Run action is core
 * (not gated here).
 *
 * Like surfaces: unset env = everything on (upstream-safe); an explicit list
 * = exactly those; an unknown name throws rather than silently no-ops.
 */
import { describe, expect, it } from "vitest";

import {
  resolveFeatures,
  featureEnabled,
  UnknownFeatureError,
} from "@/lib/features";

describe("resolveFeatures", () => {
  it("enables exactly the listed optional features", () => {
    const f = resolveFeatures("search");
    expect(featureEnabled("search", f)).toBe(true);
    expect(featureEnabled("terminal", f)).toBe(false);
    expect(featureEnabled("create", f)).toBe(false);
    expect(featureEnabled("approvals", f)).toBe(false);
    expect(featureEnabled("settings", f)).toBe(false);
    expect(featureEnabled("repoSwitcher", f)).toBe(false);
    expect(featureEnabled("registry", f)).toBe(false);
  });

  it("enables every optional feature when unset (upstream-safe default)", () => {
    for (const cfg of [undefined, null]) {
      const f = resolveFeatures(cfg);
      expect(featureEnabled("terminal", f)).toBe(true);
      expect(featureEnabled("settings", f)).toBe(true);
      expect(featureEnabled("search", f)).toBe(true);
    }
  });

  it("an explicit empty string disables every optional feature", () => {
    const f = resolveFeatures("");
    expect(featureEnabled("search", f)).toBe(false);
    expect(featureEnabled("terminal", f)).toBe(false);
  });

  it("throws on an unknown feature name, naming it", () => {
    expect(() => resolveFeatures("serch")).toThrow(UnknownFeatureError);
    expect(() => resolveFeatures("serch")).toThrow(/serch/);
  });
});
