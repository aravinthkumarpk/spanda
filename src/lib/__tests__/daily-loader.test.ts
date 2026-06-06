/**
 * daily-loader — reads today's daily HTML from disk and prepares it
 * for inlining inside the spanda /today route.
 *
 * Source path convention (per phase2.html spec):
 *   ${DAILY_ROOT}/YYYY/MM/DD.html
 *
 * Fallbacks: if today's file is missing, search backward up to 7 days
 * for the most-recent prior daily; if NONE exists, throw a clearly-
 * named error so the page can render an empty state.
 *
 * Hermetic per CLAUDE.md: builds in-memory fixture fs via a `readFile`
 * + `exists` interface the caller injects. No real fs reads here.
 */

import { describe, expect, it } from "vitest";
import {
  buildDailyPath,
  extractBodyContent,
  loadDailyHtml,
  type DailyLoaderFs,
} from "@/lib/daily-loader";

describe("buildDailyPath: date → file path", () => {
  it("builds YYYY/MM/DD.html under a root", () => {
    expect(buildDailyPath("/root", new Date("2026-05-24T18:00:00Z")))
      .toBe("/root/2026/05/24.html");
  });

  it("zero-pads single-digit months + days", () => {
    expect(buildDailyPath("/root", new Date("2026-01-05T00:00:00Z")))
      .toBe("/root/2026/01/05.html");
  });
});

describe("extractBodyContent: strip wrapper, keep inline styles", () => {
  it("returns the content of <body> without the wrapping tags", () => {
    const html = "<html><head><title>x</title></head><body><p>hello</p></body></html>";
    expect(extractBodyContent(html)).toBe("<p>hello</p>");
  });

  it("preserves inline <style> blocks that live INSIDE body", () => {
    const html = "<html><body><style>.a{color:red}</style><div>x</div></body></html>";
    const result = extractBodyContent(html);
    expect(result).toContain("<style>.a{color:red}</style>");
    expect(result).toContain("<div>x</div>");
  });

  it("hoists <head><style> blocks INTO the extracted body so styling survives", () => {
    const html = "<html><head><style>.a{color:red}</style></head><body><div>x</div></body></html>";
    const result = extractBodyContent(html);
    expect(result).toContain("<style>.a{color:red}</style>");
    expect(result).toContain("<div>x</div>");
  });

  it("returns the input verbatim if no <body> tag (defensive)", () => {
    expect(extractBodyContent("<p>just a fragment</p>")).toBe("<p>just a fragment</p>");
  });

  it("handles body tags with attributes", () => {
    expect(extractBodyContent('<html><body class="x">content</body></html>'))
      .toBe("content");
  });
});

function makeFs(files: Record<string, string>): DailyLoaderFs {
  return {
    exists: (path) => files[path] !== undefined,
    read: (path) => {
      if (files[path] === undefined) throw new Error(`ENOENT: ${path}`);
      return files[path];
    },
  };
}

describe("loadDailyHtml: UTC behavior", () => {
  it("returns today's file when present", () => {
    const fs = makeFs({
      "/root/2026/05/24.html": "<html><body>Today!</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-24T12:00:00Z"),
      fs,
      timezone: "UTC",
    });
    expect(result.body).toContain("Today!");
    expect(result.usedDate).toBe("2026-05-24");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to the most-recent prior daily within the 7-day window", () => {
    const fs = makeFs({
      "/root/2026/05/22.html": "<html><body>From two days ago</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-24T12:00:00Z"),
      fs,
      timezone: "UTC",
    });
    expect(result.body).toContain("From two days ago");
    expect(result.usedDate).toBe("2026-05-22");
    expect(result.fellBack).toBe(true);
  });

  it("throws when no daily found within the 7-day window", () => {
    const fs = makeFs({
      "/root/2026/05/01.html": "<html><body>Way too old</body></html>",
    });
    expect(() => loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-24T12:00:00Z"),
      fs,
      timezone: "UTC",
    })).toThrow(/no daily found/i);
  });

});

describe("loadDailyHtml: fail-loud on invalid timezone", () => {
  // T2 — Fail loud on invalid IANA timezone. Per CLAUDE.md "Fail Loudly":
  // an invalid timezone must throw with the greppable subsystem marker so
  // a misconfigured SPANDA_DAILY_TZ env var surfaces as a clear config gap
  // instead of silently coalescing to UTC (which would hide the drift).
  it("fails loud with SPANDA DAILY LOADER marker when timezone is invalid", () => {
    const fs = makeFs({
      "/root/2026/05/24.html": "<html><body>x</body></html>",
    });
    expect(() => loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-24T12:00:00Z"),
      fs,
      timezone: "Mars/Olympus",
    })).toThrow(/SPANDA DAILY LOADER/);
  });
});

describe("loadDailyHtml: IST timezone behavior", () => {
  // T1 — IST shift. When 'now' is late UTC but already next day in IST,
  // the loader must look for the IST-today file first, not the UTC-today
  // file. This reproduces the Sun 31 May 01:11 IST bug where the loader
  // walked UTC-30 backward and fell back to 27.html, missing 31.html
  // entirely.
  it("loads tomorrow-in-UTC when now is late-UTC but next-day in IST", () => {
    const fs = makeFs({
      "/root/2026/05/31.html": "<html><body>31 May IST today</body></html>",
      "/root/2026/05/30.html": "<html><body>30 May UTC today</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      // Sat 30 May 19:41 UTC = Sun 31 May 01:11 IST
      now: new Date("2026-05-30T19:41:00Z"),
      timezone: "Asia/Kolkata",
      fs,
    });
    expect(result.body).toContain("31 May IST today");
    expect(result.usedDate).toBe("2026-05-31");
    expect(result.fellBack).toBe(false);
  });

  // T3 — IST fallback walks back from the IST today, not the UTC today.
  // If the IST-today file is missing, the loader should walk to IST-1
  // (= 30 May), not UTC-0 (= 30 May happens to coincide here but the
  // returned fellBack must reflect that we did fall back from IST today).
  // Catches regressions where fallback re-uses the original UTC `now`.
  it("falls back from IST today, not UTC today, when IST today's file is missing", () => {
    const fs = makeFs({
      // No 31.html — the IST today's file is missing.
      "/root/2026/05/30.html": "<html><body>30 May (IST yesterday)</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      // Sat 30 May 19:41 UTC = Sun 31 May 01:11 IST
      now: new Date("2026-05-30T19:41:00Z"),
      timezone: "Asia/Kolkata",
      fs,
    });
    expect(result.body).toContain("30 May (IST yesterday)");
    expect(result.usedDate).toBe("2026-05-30");
    // Critical: this MUST be true — we did fall back from IST-today (31).
    // If a regression makes the loader walk UTC instead, fellBack would
    // be false and usedDate would still be 2026-05-30 — looks the same
    // but is wrong. The fellBack flag is the canary.
    expect(result.fellBack).toBe(true);
  });

  it("crosses month boundary backward (2026-05-01 → 2026-04-30)", () => {
    const fs = makeFs({
      "/root/2026/04/30.html": "<html><body>Last day of April</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-01T12:00:00Z"),
      fs,
      timezone: "UTC",
    });
    expect(result.body).toContain("Last day of April");
    expect(result.usedDate).toBe("2026-04-30");
    expect(result.fellBack).toBe(true);
  });

  it("captures the daily's <title> tag if present (for the spanda banner)", () => {
    const fs = makeFs({
      "/root/2026/05/24.html":
        "<html><head><title>Daily Review · 24 May 2026</title></head><body>x</body></html>",
    });
    const result = loadDailyHtml({
      root: "/root",
      now: new Date("2026-05-24T12:00:00Z"),
      fs,
      timezone: "UTC",
    });
    expect(result.title).toBe("Daily Review · 24 May 2026");
  });
});
