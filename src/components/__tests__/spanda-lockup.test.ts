/**
 * SpandaLockup — replaces FooleryWordmark in the app header.
 *
 * Renders the design-system lockup SVG: pearl body (circle with
 * radial gradient), two lime eyes (#9fe870 rects), Manrope 900
 * "spanda" wordmark text node that inherits currentColor so the
 * caller controls light/dark via Tailwind text-* utilities.
 *
 * Source SVG: src/design-system/assets/spanda_lockup.svg.
 *
 * Hermetic test per CLAUDE.md: react-dom/server SSR string-match,
 * no JSDOM, no browser.
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpandaLockup } from "@/components/spanda-lockup";

describe("SpandaLockup", () => {
  const html = renderToStaticMarkup(createElement(SpandaLockup));

  it("renders an SVG with role='img' and aria-label='spanda'", () => {
    expect(html).toMatch(/<svg[^>]*role="img"/);
    expect(html).toMatch(/aria-label="spanda"/);
  });

  it("includes the pearl body — circle with radius 34 fill via gradient", () => {
    expect(html).toMatch(/<circle[^>]*r="34"/);
    expect(html).toMatch(/url\(#[^)]+Pearl[^)]*\)/);
  });

  it("includes the TWO lime eyes (rect ×2 with fill #9fe870)", () => {
    const limeRects = html.match(/<rect[^>]*fill="#9fe870"[^>]*\/?>/g) ?? [];
    expect(limeRects.length).toBe(2);
  });

  it("includes the 'spanda' wordmark text node in Manrope 900", () => {
    expect(html).toMatch(/>spanda</);
    expect(html).toMatch(/font-weight="900"|fontWeight="900"/);
    expect(html.toLowerCase()).toMatch(/manrope/);
  });

  it("wordmark inherits currentColor (no hard-coded fill on the text node)", () => {
    expect(html).toMatch(/<text[^>]*fill="currentColor"/);
  });

  it("forwards a custom className to the root <svg>", () => {
    const custom = renderToStaticMarkup(
      createElement(SpandaLockup, { className: "h-12 w-auto text-ink-900" })
    );
    expect(custom).toMatch(/<svg[^>]*class="h-12 w-auto text-ink-900"/);
  });

  it("supports an aria-label override (defaults to 'spanda')", () => {
    const labelled = renderToStaticMarkup(
      createElement(SpandaLockup, { "aria-label": "spanda — return home" })
    );
    // React SSR doesn't HTML-entity-encode em-dashes inside attribute values
    // (only HTML-unsafe chars like &, <, >, ", '). Match the literal.
    expect(labelled).toMatch(/aria-label="spanda — return home"/);
  });
});
