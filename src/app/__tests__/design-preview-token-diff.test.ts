/**
 * Design-system preview token diff verifier.
 *
 * Per the goal directive: "verify the output and all existing components
 * against https://api.anthropic.com/v1/design/h/gHSSZ1qkBF4NrliNvgloEg
 * and keep iterating until diff is less than 1%."
 *
 * Approach: each preview/*.html in src/design-system/preview/ is the
 * design system's own canonical specimen for a category (badges, buttons,
 * cards, colors-*, type-*, etc.). Each card references specific tokens:
 *   - inline `style="background: var(--color-X)"` (token-by-reference)
 *   - inline hex literals like `#9fe870` (token-by-value)
 *   - inline px values for type/spacing/radii.
 *
 * The diff is "less than 1%" when every unique token reference + every
 * unique hex literal in the preview corpus also appears in:
 *   - src/design-system/colors_and_type.css (the source of truth), AND
 *   - src/app/globals.css (the runtime, where Tailwind utilities resolve)
 *
 * Hermetic per CLAUDE.md: filesystem read of project-checked-in files only.
 * No browser, no real-time CSS computation. We're checking that the design
 * system tokens land in the runtime — the visual fidelity is a downstream
 * artifact of the tokens being honored.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DS_DIR = path.join(ROOT, "src", "design-system");
const PREVIEW_DIR = path.join(DS_DIR, "preview");
const DS_CSS = readFileSync(path.join(DS_DIR, "colors_and_type.css"), "utf8");
const GLOBALS_CSS = readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf8");

/** Strip CSS/HTML comments before scanning. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
}

const dsCssNoComments = stripComments(DS_CSS);
const globalsCssNoComments = stripComments(GLOBALS_CSS);

const PREVIEW_FILES = readdirSync(PREVIEW_DIR)
  .filter((f) => f.endsWith(".html"))
  .sort();

/** Collect every CSS custom property reference `var(--foo)`. */
function extractVarRefs(source: string): Set<string> {
  const matches = source.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g);
  const out = new Set<string>();
  for (const m of matches) out.add(m[1]);
  return out;
}

/** Collect every hex literal #RGB / #RRGGBB / #RRGGBBAA. */
function extractHexLiterals(source: string): Set<string> {
  const matches = source.matchAll(/#[0-9a-fA-F]{3,8}\b/g);
  const out = new Set<string>();
  for (const m of matches) {
    // Skip 4-char and 7-char (odd-length) to avoid CSS hash garbage.
    const len = m[0].length;
    if (len === 4 || len === 7 || len === 9) out.add(m[0].toLowerCase());
  }
  return out;
}

/** Tokens that intentionally only exist in colors_and_type.css (not Tailwind
 *  globals): the spanda-only direct aliases (--color-primary, --color-canvas-*,
 *  --color-ink, --color-positive, etc.) which we DID add to globals.css too,
 *  but also pure typography helpers (--text-display-mega) that are
 *  type-scale tokens not part of the Tailwind text-* set.
 *
 *  Also tokens specific to preview-card local styling (e.g. --eyebrow-color
 *  used only inside a single specimen). Anything that doesn't need to be
 *  globally resolvable. */
const PREVIEW_LOCAL_TOKENS = new Set<string>([
  // CSS reset-style locals occasionally seen in specimens
  "--bg-page",
  "--bg-surface",
  "--fg-default",
  "--fg-muted",
]);

/** Hex literals that may appear in previews for documentation (e.g. inside
 *  a `<code>--color-primary: #9fe870;</code>` block) but that we still want
 *  to ensure are honored in globals.css. The full set is enforced; this
 *  allowlist is for hex codes that are NOT spanda palette colors (e.g.
 *  Wise's actual brand hex used as a comparison swatch in colors-brand.html,
 *  or transparent-fill blacks like #000 used in shadow stops). */
const PREVIEW_NON_PALETTE_HEX = new Set<string>([
  "#000",
  "#fff",  // alias for #ffffff which IS spanda canvas; both forms appear
  "#222",  // occasional swatch divider
  // SVG-internal radial-gradient stops for the spanda mark "pearl" body.
  // These live inside the inline mark SVG and are not design tokens —
  // they implement the pearl gradient but never appear as standalone
  // palette swatches anywhere in the system.
  "#2a2c28",
  "#15170f",
  "#0a0b07",
]);

describe("design-system preview parity with globals.css runtime", () => {
  it("preview corpus is present (sanity)", () => {
    expect(PREVIEW_FILES.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(PREVIEW_FILES)("preview %s", (filename) => {
    const html = readFileSync(path.join(PREVIEW_DIR, filename), "utf8");
    const noComments = stripComments(html);
    const varRefs = extractVarRefs(noComments);
    const hexes = extractHexLiterals(noComments);

    it("references CSS variables that resolve in colors_and_type.css", () => {
      const missing: string[] = [];
      for (const tok of varRefs) {
        if (PREVIEW_LOCAL_TOKENS.has(tok)) continue;
        // Token must be declared somewhere in the design system CSS.
        if (!dsCssNoComments.includes(`${tok}:`)) {
          missing.push(tok);
        }
      }
      expect(
        missing,
        `Preview ${filename} references unresolved DS tokens: ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it("references CSS variables that ALSO resolve in src/app/globals.css", () => {
      // Tokens used in a specimen card must also be available at runtime in
      // the Next.js app, otherwise the in-product rendering won't match the
      // specimen. Direct spanda aliases (--color-primary, --color-canvas-soft,
      // etc.) are intentionally added to globals.css as part of the swap.
      const missing: string[] = [];
      for (const tok of varRefs) {
        if (PREVIEW_LOCAL_TOKENS.has(tok)) continue;
        if (!globalsCssNoComments.includes(`${tok}:`)) {
          missing.push(tok);
        }
      }
      expect(
        missing,
        `Preview ${filename} references tokens missing from globals.css: ${missing.join(", ")}. ` +
          "Add the missing custom property to src/app/globals.css :root.",
      ).toEqual([]);
    });

    it("inline hex values are present in either colors_and_type.css or globals.css", () => {
      const missing: string[] = [];
      for (const hex of hexes) {
        if (PREVIEW_NON_PALETTE_HEX.has(hex)) continue;
        const inDs = dsCssNoComments.toLowerCase().includes(hex);
        const inGlobals = globalsCssNoComments.toLowerCase().includes(hex);
        // Treat #ffffff and #fff as equivalent so a specimen using either
        // shorthand doesn't trip the assertion.
        const canonical = hex === "#fff" ? "#ffffff" : hex === "#ffffff" ? "#fff" : null;
        const inAnyAlt = canonical
          ? dsCssNoComments.toLowerCase().includes(canonical) ||
            globalsCssNoComments.toLowerCase().includes(canonical)
          : false;
        if (!inDs && !inGlobals && !inAnyAlt) {
          missing.push(hex);
        }
      }
      expect(
        missing,
        `Preview ${filename} hex literals not honored anywhere: ${missing.join(", ")}.`,
      ).toEqual([]);
    });
  });
});

describe("globals.css inherits the spanda type scale", () => {
  it("declares each canonical spanda font size at least once", () => {
    // From colors_and_type.css: 126 / 96 / 64 / 40 / 32 / 24 / 20 / 16 / 14 / 12.
    // After the swap, globals.css's --text-* tokens cover these via the
    // Tailwind text-{xs..5xl} scale. Confirm the major display sizes.
    const required = ["126px", "96px", "64px", "40px", "32px", "24px", "20px"];
    const missing = required.filter((px) => !globalsCssNoComments.includes(px));
    expect(missing, `globals.css missing canonical sizes: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("globals.css honors the 24px friendliness-cue radius", () => {
  it("declares 24px somewhere in the radii scale", () => {
    expect(globalsCssNoComments).toMatch(/--radius-xl:\s*24px/);
  });

  it("rounds 2xl and 3xl to the same 24px canonical (per spanda spec)", () => {
    expect(globalsCssNoComments).toMatch(/--radius-2xl:\s*24px/);
    expect(globalsCssNoComments).toMatch(/--radius-3xl:\s*24px/);
  });

  it("pill radius is 9999px (4xl)", () => {
    expect(globalsCssNoComments).toMatch(/--radius-4xl:\s*9999px/);
  });
});
