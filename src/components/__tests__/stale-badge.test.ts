/**
 * StaleBadge — renders "stale Nd" when a bead hasn't been updated in
 * 7+ days and isn't closed. Surfaces stuck-in-progress beads on the
 * board so they don't rot silently.
 *
 * Threshold: 7 days (one week). Closed/abandoned/shipped beads never
 * show the badge regardless of age (already terminal).
 *
 * Styling per DESIGN.md: --color-warning-pale bg + --color-warning-content
 * text. Tailwind utilities: bg-ochre-100 + text-ochre-700.
 *
 * Hermetic: SSR string-match.
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaleBadge } from "@/components/stale-badge";

const NOW = new Date("2026-05-24T18:00:00Z").getTime();
const day = 86_400_000;

function ago(days: number): string {
  return new Date(NOW - days * day).toISOString();
}

describe("StaleBadge", () => {
  it("renders 'stale 8d' when updated 8 days ago and bead is open", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(8), isTerminal: false, now: NOW }),
    );
    expect(html).toMatch(/stale\s*8d/i);
  });

  it("renders 'stale 30d' for a 30-day-stale bead", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(30), isTerminal: false, now: NOW }),
    );
    expect(html).toMatch(/stale\s*30d/i);
  });

  it("renders NOTHING when updated 3 days ago (< 7-day threshold)", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(3), isTerminal: false, now: NOW }),
    );
    expect(html).toBe("");
  });

  it("renders NOTHING exactly at the 7-day boundary (must EXCEED threshold)", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(7), isTerminal: false, now: NOW }),
    );
    expect(html).toBe("");
  });

  it("renders 'stale 8d' just past the 7-day boundary", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(8), isTerminal: false, now: NOW }),
    );
    expect(html).toMatch(/stale/);
  });

  it("renders NOTHING for a terminal bead regardless of age", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(180), isTerminal: true, now: NOW }),
    );
    expect(html).toBe("");
  });

  it("uses --color-warning-pale background + --color-warning-content text (Tailwind ochre family)", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: ago(15), isTerminal: false, now: NOW }),
    );
    expect(html).toMatch(/bg-ochre-100/);
    expect(html).toMatch(/text-ochre-700/);
  });

  it("renders NOTHING when updatedAt is null / undefined (fail-soft)", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, { updatedAt: null, isTerminal: false, now: NOW }),
    );
    expect(html).toBe("");
  });

  it("renders NOTHING when updatedAt is malformed (fail-soft)", () => {
    const html = renderToStaticMarkup(
      createElement(StaleBadge, {
        updatedAt: "not-a-date",
        isTerminal: false,
        now: NOW,
      }),
    );
    expect(html).toBe("");
  });

  it("requires `now` (caller-supplied); a synthetic 'just now' bead is NOT stale", () => {
    // Per React 19 react-hooks/purity, the component requires `now`
    // explicitly — never calls Date.now() internally.
    const liveNow = Date.now();
    const html = renderToStaticMarkup(
      createElement(StaleBadge, {
        updatedAt: new Date(liveNow).toISOString(),
        isTerminal: false,
        now: liveNow,
      }),
    );
    expect(html).toBe("");
  });
});
