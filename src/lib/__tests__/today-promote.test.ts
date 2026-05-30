/**
 * today-promote — pure layer for promoting a /today daily line into a
 * Board task (Q6).
 *
 *   - buildTodaySourceLabel(date): 'source:today-YYYY-MM-DD' (UTC, padded).
 *   - parseTodaySourceLabel(label): 'YYYY-MM-DD' or null.
 *   - lineToPromoteDefaults(line, opts): pre-filled promote-form defaults
 *     (title = trimmed line, empty acceptance stub, work:do + source label,
 *     no parent, canonical repo, undefined profileId).
 *   - collectPromotedLines(tasks): trimmed titles of tasks carrying any
 *     source:today-* label.
 *   - isLinePromoted(line, promotedTitles): trimmed, case-sensitive match.
 *
 * Integration-shape test proves the promote defaults are INVALID for the
 * `do` profile until acceptance is filled — nothing is created silently.
 *
 * Hermetic — dates passed in, no wall clock.
 */

import { describe, expect, it } from "vitest";
import {
  buildPromotePayload,
  buildTodayKeyLabel,
  buildTodaySourceLabel,
  collectPromotedKeys,
  collectPromotedLines,
  isKeyPromoted,
  isLinePromoted,
  lineToPromoteDefaults,
  markerToQuickCaptureInput,
  parseTodayKeyLabel,
  parseTodaySourceLabel,
  type PromoteMarker,
} from "@/lib/today-promote";
import { validateQuickCapturePayload } from "@/lib/quick-capture";

function marker(overrides: Partial<PromoteMarker> = {}): PromoteMarker {
  return {
    key: "2026-05-30:agent-studio:cart",
    title: "Cart pass-rate fix to 95%",
    bucket: "do",
    acceptance: "pass rate >=95% for 72h",
    ...overrides,
  };
}

const CANON = "/home/deploy/code/personal-os";

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

describe("buildTodaySourceLabel", () => {
  it("formats source:today-YYYY-MM-DD from UTC components", () => {
    expect(buildTodaySourceLabel(utc(2026, 5, 30))).toBe("source:today-2026-05-30");
  });

  it("zero-pads single-digit month and day", () => {
    expect(buildTodaySourceLabel(utc(2026, 1, 3))).toBe("source:today-2026-01-03");
  });

  it("uses UTC components (not local) for an instant near midnight", () => {
    // 2026-05-30T23:30:00Z is still the 30th in UTC.
    expect(buildTodaySourceLabel(new Date("2026-05-30T23:30:00Z"))).toBe(
      "source:today-2026-05-30",
    );
  });
});

describe("parseTodaySourceLabel", () => {
  it("extracts YYYY-MM-DD from a valid source label", () => {
    expect(parseTodaySourceLabel("source:today-2026-05-30")).toBe("2026-05-30");
  });

  it("round-trips with buildTodaySourceLabel", () => {
    const label = buildTodaySourceLabel(utc(2026, 12, 9));
    expect(parseTodaySourceLabel(label)).toBe("2026-12-09");
  });

  it("rejects an unrelated label (work:do)", () => {
    expect(parseTodaySourceLabel("work:do")).toBeNull();
  });

  it("rejects a malformed date payload", () => {
    expect(parseTodaySourceLabel("source:today-garbage")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseTodaySourceLabel("")).toBeNull();
  });

  it("rejects a non-padded / wrong-shape date", () => {
    expect(parseTodaySourceLabel("source:today-2026-5-3")).toBeNull();
  });

  it("rejects a source label for a different source", () => {
    expect(parseTodaySourceLabel("source:inbox-2026-05-30")).toBeNull();
  });
});

describe("lineToPromoteDefaults", () => {
  const opts = { date: utc(2026, 5, 30), canonicalRepo: CANON };

  it("uses the trimmed line as the title", () => {
    const d = lineToPromoteDefaults("  buy milk  ", opts);
    expect(d.title).toBe("buy milk");
  });

  it("leaves acceptance as an empty stub", () => {
    expect(lineToPromoteDefaults("x", opts).acceptance).toBe("");
  });

  it("labels with work:do and the source label", () => {
    const d = lineToPromoteDefaults("x", opts);
    expect(d.labels).toContain("work:do");
    expect(d.labels).toContain("source:today-2026-05-30");
  });

  it("sets parent undefined (unsorted, no project)", () => {
    expect(lineToPromoteDefaults("x", opts).parent).toBeUndefined();
  });

  it("threads the canonical repo so it lands in the work repo", () => {
    expect(lineToPromoteDefaults("x", opts).repo).toBe(CANON);
  });

  it("leaves profileId undefined (server resolves the live do descriptor)", () => {
    expect(lineToPromoteDefaults("x", opts).profileId).toBeUndefined();
  });
});

describe("collectPromotedLines", () => {
  it("collects trimmed titles of tasks carrying a source:today-* label", () => {
    const set = collectPromotedLines([
      { title: "  buy milk  ", labels: ["work:do", "source:today-2026-05-29"] },
      { title: "ignore me", labels: ["work:do"] },
    ]);
    expect(set.has("buy milk")).toBe(true);
    expect(set.has("ignore me")).toBe(false);
  });

  it("matches any source:today-* date, not just one day", () => {
    const set = collectPromotedLines([
      { title: "a", labels: ["source:today-2026-01-01"] },
      { title: "b", labels: ["source:today-2026-12-31"] },
    ]);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
  });

  it("ignores other source:* labels", () => {
    const set = collectPromotedLines([
      { title: "a", labels: ["source:inbox-2026-01-01"] },
    ]);
    expect(set.has("a")).toBe(false);
  });

  it("returns an empty set for no matching tasks", () => {
    expect(collectPromotedLines([]).size).toBe(0);
  });
});

describe("isLinePromoted", () => {
  const promoted = new Set(["buy milk", "call bob"]);

  it("matches a trimmed line that was promoted", () => {
    expect(isLinePromoted("  buy milk  ", promoted)).toBe(true);
  });

  it("returns false for a line not yet promoted", () => {
    expect(isLinePromoted("walk dog", promoted)).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isLinePromoted("Buy Milk", promoted)).toBe(false);
  });

  it("returns false for an empty line", () => {
    expect(isLinePromoted("   ", promoted)).toBe(false);
    expect(isLinePromoted("", promoted)).toBe(false);
  });
});

describe("integration shape: promote defaults gate on acceptance", () => {
  const opts = { date: utc(2026, 5, 30), canonicalRepo: CANON };

  it("is INVALID for `do` until acceptance is filled (nothing created silently)", () => {
    const d = lineToPromoteDefaults("buy milk", opts);
    const result = validateQuickCapturePayload({
      title: d.title,
      description: "",
      profile: "do",
      acceptance: d.acceptance,
      person: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/acceptance/i);
  });

  it("becomes VALID once acceptance is supplied", () => {
    const d = lineToPromoteDefaults("buy milk", opts);
    const result = validateQuickCapturePayload({
      title: d.title,
      description: "",
      profile: "do",
      acceptance: "2 litres in the fridge",
      person: null,
    });
    expect(result.ok).toBe(true);
  });
});

describe("today-key dedup labels", () => {
  it("round-trips buildTodayKeyLabel / parseTodayKeyLabel", () => {
    const label = buildTodayKeyLabel("2026-05-30:as:cart");
    expect(label).toBe("today-key:2026-05-30:as:cart");
    expect(parseTodayKeyLabel(label)).toBe("2026-05-30:as:cart");
  });

  it("rejects non today-key labels", () => {
    expect(parseTodayKeyLabel("work:do")).toBeNull();
    expect(parseTodayKeyLabel("today-key:")).toBeNull();
  });

  it("collectPromotedKeys gathers keys; isKeyPromoted matches", () => {
    const keys = collectPromotedKeys([
      { labels: ["work:do", "today-key:k1", "source:today-2026-05-30"] },
      { labels: ["work:do"] },
      { labels: ["today-key:k2"] },
    ]);
    expect(keys).toEqual(new Set(["k1", "k2"]));
    expect(isKeyPromoted("k1", keys)).toBe(true);
    expect(isKeyPromoted("nope", keys)).toBe(false);
    expect(isKeyPromoted("  ", keys)).toBe(false);
  });
});

describe("markerToQuickCaptureInput", () => {
  it("maps bucket -> profile and keeps acceptance, no person for do", () => {
    const input = markerToQuickCaptureInput(marker());
    expect(input.profile).toBe("do");
    expect(input.acceptance).toBe("pass rate >=95% for 72h");
    expect(input.person).toBeNull();
    expect(input.title).toBe("Cart pass-rate fix to 95%");
  });

  it("keeps person for coordinate, drops it for do", () => {
    const coord = markerToQuickCaptureInput(
      marker({ bucket: "coordinate", person: "khilan", acceptance: "" }),
    );
    expect(coord.profile).toBe("coordinate");
    expect(coord.person).toBe("khilan");
    const doMarker = markerToQuickCaptureInput(marker({ person: "khilan" }));
    expect(doMarker.person).toBeNull();
  });

  it("tolerates a work: prefixed bucket", () => {
    expect(markerToQuickCaptureInput(marker({ bucket: "work:do" })).profile)
      .toBe("do");
  });
});

describe("buildPromotePayload", () => {
  const date = utc(2026, 5, 30);

  it("assembles work, source, and today-key labels", () => {
    const p = buildPromotePayload(marker(), date);
    expect(p.title).toBe("Cart pass-rate fix to 95%");
    expect(p.acceptance).toBe("pass rate >=95% for 72h");
    expect(p.labels).toContain("work:do");
    expect(p.labels).toContain("source:today-2026-05-30");
    expect(p.labels).toContain("today-key:2026-05-30:agent-studio:cart");
  });

  it("adds a project label when provided, not for unsorted/empty", () => {
    expect(buildPromotePayload(marker({ project: "agent-studio" }), date).labels)
      .toContain("project:agent-studio");
    expect(buildPromotePayload(marker({ project: "unsorted" }), date).labels
      .some((l) => l.startsWith("project:"))).toBe(false);
    expect(buildPromotePayload(marker({ project: "" }), date).labels
      .some((l) => l.startsWith("project:"))).toBe(false);
  });

  it("adds with:<person> for a coordinate marker", () => {
    const p = buildPromotePayload(
      marker({ bucket: "coordinate", person: "khilan", acceptance: "" }),
      date,
    );
    expect(p.labels).toContain("work:coordinate");
    expect(p.labels).toContain("with:khilan");
  });
});
