/**
 * Surface allowlist (MVP hyper-focus): which /beats views are visible.
 *
 * Behaviors, not implementation: a deploy can narrow Spanda to a few
 * surfaces; absent config keeps every view (upstream-safe default); a
 * config typo fails loud; a URL pointing at a hidden view falls back to
 * the first allowed view instead of 404ing or leaking the hidden surface.
 */
import { describe, expect, it } from "vitest";

import {
  resolveSurfaces,
  parseAllowedBeatsView,
  selectViewTabs,
  UnknownSurfaceError,
} from "@/lib/surfaces";

describe("resolveSurfaces", () => {
  it("narrows to exactly the configured views, in config order", () => {
    expect(resolveSurfaces("projects,board")).toEqual(["projects", "board"]);
  });

  it("keeps every view when no config is set (upstream-safe default)", () => {
    const all = resolveSurfaces(undefined);
    expect(all).toContain("queues");
    expect(all).toContain("setlist");
    expect(all).toContain("diagnostics");
    expect(all.length).toBeGreaterThanOrEqual(12);
    expect(resolveSurfaces(null)).toEqual(all);
    expect(resolveSurfaces("")).toEqual(all);
    expect(resolveSurfaces("   ")).toEqual(all);
  });

  it("throws a named error on a config typo, naming the bad value", () => {
    expect(() => resolveSurfaces("projects,bord")).toThrow(
      UnknownSurfaceError,
    );
    expect(() => resolveSurfaces("projects,bord")).toThrow(/bord/);
  });
});

describe("parseAllowedBeatsView", () => {
  const narrowed = resolveSurfaces("projects,board");

  it("returns the requested view when it is allowed", () => {
    expect(parseAllowedBeatsView("board", narrowed)).toBe("board");
  });

  it("falls back to the first allowed view for a hidden view URL", () => {
    expect(parseAllowedBeatsView("setlist", narrowed)).toBe("projects");
  });

  it("falls back to the first allowed view when no view param and the old default is hidden", () => {
    // upstream default is "queues"; with queues hidden the deploy's first
    // surface wins instead
    expect(parseAllowedBeatsView(null, narrowed)).toBe("projects");
  });

  it("keeps upstream behavior when nothing is narrowed", () => {
    const all = resolveSurfaces(undefined);
    expect(parseAllowedBeatsView(null, all)).toBe("queues");
    expect(parseAllowedBeatsView("setlist", all)).toBe("setlist");
  });
});

describe("selectViewTabs", () => {
  it("renders only allowed primary tabs and hides the More menu when empty", () => {
    const tabs = selectViewTabs(resolveSurfaces("projects,board"));
    expect(tabs.primary).toEqual(["board", "projects"]);
    expect(tabs.more).toEqual([]);
  });

  it("keeps the full upstream tab set when nothing is narrowed", () => {
    const tabs = selectViewTabs(resolveSurfaces(undefined));
    expect(tabs.primary).toEqual(["board", "projects", "review"]);
    expect(tabs.more).toContain("setlist");
    expect(tabs.more).toContain("diagnostics");
    expect(tabs.more).toHaveLength(8);
  });
});
