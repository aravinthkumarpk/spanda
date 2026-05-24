/**
 * Spanda design-token mapping verification.
 *
 * Asserts that src/app/globals.css carries the spanda palette
 * (lime + sage + ink) and types (Manrope display, Inter sans, IBM
 * Plex Mono) — not the legacy earth-tone palette (clay / paper /
 * Space Grotesk).
 *
 * Hermetic per CLAUDE.md: no real-time CSS computation, no JSDOM
 * style resolution. Reads the file as text and asserts critical
 * substrings + values are present.
 *
 * Spec source: src/design-system/DESIGN.md, src/design-system/colors_and_type.css.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const GLOBALS_PATH = path.resolve(__dirname, "..", "globals.css");
const css = readFileSync(GLOBALS_PATH, "utf8");

/** Strip CSS comments before grepping so an example hex inside a comment
 *  doesn't satisfy an assertion that expects the value in real declarations. */
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("globals.css: spanda palette + typography mapping", () => {
  describe("brand & accent (lime is universal CTA, only accent)", () => {
    it("declares the spanda lime hex value", () => {
      expect(cssNoComments).toMatch(/#9fe870\b/i);
    });

    it("declares the spanda lime hover lift", () => {
      expect(cssNoComments).toMatch(/#cdffad\b/i);
    });

    it("declares the spanda lime pale (badge / surface tint)", () => {
      expect(cssNoComments).toMatch(/#e2f6d5\b/i);
    });
  });

  describe("surface (sage canvas, white card, contrast IS elevation)", () => {
    it("declares the spanda sage canvas hex value", () => {
      expect(cssNoComments).toMatch(/#e8ebe6\b/i);
    });

    it("declares the spanda sage-deep (pressed sage / divider)", () => {
      expect(cssNoComments).toMatch(/#d8dcd3\b/i);
    });
  });

  describe("ink (warm-tinted near-black, never pure #000)", () => {
    it("declares the spanda ink hex value (#0e0f0c)", () => {
      expect(cssNoComments).toMatch(/#0e0f0c\b/i);
    });

    it("does not use pure black (#000000 or #000) as the default ink", () => {
      // Look for explicit pure-black declarations on text/foreground tokens
      const blackOnFg = /(?:--(?:color-ink|foreground|fg-default)[^:]*:\s*#000(?:000)?\b)/i;
      expect(cssNoComments).not.toMatch(blackOnFg);
    });
  });

  describe("semantic colors (positive / warning / negative, NEVER the brand lime)", () => {
    it("declares the spanda positive (#2ead4b), distinct from brand lime", () => {
      expect(cssNoComments).toMatch(/#2ead4b\b/i);
    });

    it("declares the spanda warning (#ffd11a)", () => {
      expect(cssNoComments).toMatch(/#ffd11a\b/i);
    });

    it("declares the spanda negative (#d03238)", () => {
      expect(cssNoComments).toMatch(/#d03238\b/i);
    });
  });

  describe("typography (Manrope display, Inter sub-display/body, Plex Mono)", () => {
    it("binds --font-display to Manrope (NOT Space Grotesk)", () => {
      // Either --font-display references --font-manrope, or "Manrope" appears
      // in the --font-display value.
      const fontDisplayMatch = cssNoComments.match(/--font-display:\s*([^;]+);/);
      expect(fontDisplayMatch).not.toBeNull();
      const value = fontDisplayMatch![1];
      expect(value.toLowerCase()).toMatch(/manrope/);
      expect(value.toLowerCase()).not.toMatch(/space[-_]?grotesk/);
    });

    it("binds --font-sans to Inter", () => {
      const fontSansMatch = cssNoComments.match(/--font-sans:\s*([^;]+);/);
      expect(fontSansMatch).not.toBeNull();
      const value = fontSansMatch![1];
      expect(value.toLowerCase()).toMatch(/inter/);
    });

    it("keeps IBM Plex Mono as --font-mono", () => {
      const fontMonoMatch = cssNoComments.match(/--font-mono:\s*([^;]+);/);
      expect(fontMonoMatch).not.toBeNull();
      const value = fontMonoMatch![1];
      expect(value.toLowerCase()).toMatch(/plex.?mono/);
    });
  });

  describe("legacy Tailwind utility tokens — re-pointed to spanda palette", () => {
    it("clay-500 (brand-accent slot) maps to the spanda lime", () => {
      // The brand-accent utility (clay-500) drives `bg-primary` etc.
      // After the swap, it must resolve to the spanda lime.
      // Either declared directly as #9fe870 OR as oklch matching lime
      // (oklch(0.873 0.193 132.5)).
      const clay500Match = cssNoComments.match(/--color-clay-500:\s*([^;]+);/);
      expect(clay500Match).not.toBeNull();
      const value = clay500Match![1].trim().toLowerCase();
      const isLime =
        value.includes("#9fe870") ||
        /oklch\(\s*0\.873\s+0\.193\s+132/.test(value);
      expect(isLime, `--color-clay-500 should be spanda lime but is "${value}"`).toBe(true);
    });

    it("paper-100 (default background) maps to the spanda sage canvas", () => {
      const paper100Match = cssNoComments.match(/--color-paper-100:\s*([^;]+);/);
      expect(paper100Match).not.toBeNull();
      const value = paper100Match![1].trim().toLowerCase();
      const isSage =
        value.includes("#e8ebe6") ||
        /oklch\(\s*0\.924\s+0\.005\s+130/.test(value);
      expect(isSage, `--color-paper-100 should be spanda sage canvas but is "${value}"`).toBe(true);
    });

    it("ink-900 (default text) maps to spanda ink (warm-olive near-black)", () => {
      const ink900Match = cssNoComments.match(/--color-ink-900:\s*([^;]+);/);
      expect(ink900Match).not.toBeNull();
      const value = ink900Match![1].trim().toLowerCase();
      const isInk =
        value.includes("#0e0f0c") ||
        /oklch\(\s*0\.143\s+0\.006\s+120/.test(value);
      expect(isInk, `--color-ink-900 should be spanda ink but is "${value}"`).toBe(true);
    });
  });

  describe("radii (24px is the friendliness cue, canonical button + card)", () => {
    it("declares 24px radius somewhere (the spanda canonical)", () => {
      expect(cssNoComments).toMatch(/24px/);
    });
  });
});
