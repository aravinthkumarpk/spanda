/**
 * DS-compliance token loop — walks every src/components/*.tsx and
 * src/app/*.tsx, asserts ZERO off-palette Tailwind utilities and
 * ZERO inline non-spanda hex codes.
 *
 * Extends the existing design-preview-token-diff.test.ts approach
 * (which asserts preview specimens) into the runtime React surface.
 *
 * Per CLAUDE.md hermetic test policy: filesystem read only, no
 * spawned processes, no host environment touched.
 *
 * Spec source: src/design-system/colors_and_type.css palette +
 * the goal directive "verify the output and all existing components
 * against [design URL] and keep iterating until diff is less than 1%."
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SRC = path.join(ROOT, "src");

/** Recursively list every .tsx / .ts file under src/, excluding
 *  test files, fixtures, the design-system reference uikits, and
 *  the design-system tokens file itself. */
function listSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Skip these dirs.
      if (entry === "__tests__") continue;
      if (entry === "__manual_tests__") continue;
      if (entry === "__fixtures__") continue;
      if (entry === "node_modules") continue;
      if (entry === ".next") continue;
      // src/design-system/reference is ignored at eslint level too.
      if (full.includes("/design-system/reference")) continue;
      listSourceFiles(full, acc);
    } else if (s.isFile()) {
      if (full.endsWith(".tsx") || full.endsWith(".ts")) {
        // Skip story files (storybook-scope).
        if (full.endsWith(".stories.tsx") || full.endsWith(".stories.ts")) {
          continue;
        }
        acc.push(full);
      }
    }
  }
  return acc;
}

const SOURCE_FILES = listSourceFiles(SRC);

/** Files exempt from the inline-hex check. terminal-theme.ts ships
 *  the xterm.js ANSI palette for the docked terminal panel — those
 *  colors need to be the conventional ANSI red/green/yellow/blue/cyan
 *  for code-output legibility. Per DESIGN.md "dark mode exists only
 *  for the terminal panel where the operator IS reading code output."
 *  The terminal palette is intentionally outside the brand palette. */
const HEX_CHECK_EXEMPT = new Set<string>([
  "src/lib/terminal-theme.ts",
]);

/** Strip TS/JS/TSX/JSX comments to avoid documentation false-positives. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/** Off-palette Tailwind utility regex. Anything that's NOT one of the
 *  spanda-mapped families (paper / ink / clay / moss / ochre / rust /
 *  lake / walnut / feature / epic / mr / molecule / gate). Captures
 *  bg-*, text-*, border-*, ring-*, fill-*, stroke-*, from-*, to-*,
 *  via-*, divide-*, decoration-*, outline-*, shadow-*, placeholder-*,
 *  caret-*, accent-* — all the color-bearing prefixes. */
const OFF_PALETTE_REGEX = new RegExp(
  "(?<![\\w-])" +
    "(bg|text|border|ring|fill|stroke|from|to|via|divide|decoration|outline|placeholder|caret|accent)-" +
    "(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-" +
    "[0-9]{2,3}" +
    "(?![\\w-])",
  "g",
);

/** Inline hex literals in JSX prop strings. */
const INLINE_HEX_REGEX = /["']#[0-9a-fA-F]{3,8}["']/g;

/** Spanda-palette hex allowlist — these are OK to inline. */
const SPANDA_PALETTE_HEXES = new Set<string>([
  // brand + accents
  "#9fe870", "#cdffad", "#c5edab", "#e2f6d5",
  // surface
  "#ffffff", "#fff", "#e8ebe6", "#d8dcd3", "#f5f7f3",
  // ink
  "#0e0f0c", "#163300", "#454745", "#868685",
  // semantic
  "#2ead4b", "#054d28", "#ffd11a", "#b86700", "#4a3b1c", "#fff4cc",
  "#d03238", "#a72027", "#320707", "#fce8e9",
  // illustrative
  "#ffc091", "#38c8ff",
  // SVG-internal pearl gradient stops (used in spanda-lockup.tsx)
  "#2a2c28", "#15170f", "#0a0b07",
  // misc neutrals OK on white/black
  "#000", "#000000", "#222",
]);

describe("DS-compliance: token loop across src/", () => {
  it("source file corpus discovered (sanity)", () => {
    expect(SOURCE_FILES.length).toBeGreaterThanOrEqual(100);
  });

  it("ZERO off-palette Tailwind utilities (bg-amber-* / text-emerald-* / etc.)", () => {
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      const code = stripComments(readFileSync(file, "utf8"));
      const matches = code.matchAll(OFF_PALETTE_REGEX);
      const rel = path.relative(ROOT, file);
      for (const m of matches) offenders.push(`${rel}: ${m[0]}`);
    }
    expect(
      offenders,
      `Off-palette utilities found:\n  ${offenders.join("\n  ")}\n` +
        "Map these to spanda palette: paper/ink/clay/moss/ochre/rust/lake/walnut.",
    ).toEqual([]);
  });

  it("ZERO inline non-spanda hex literals in components/app", () => {
    const offenders: string[] = [];
    for (const file of SOURCE_FILES) {
      const rel = path.relative(ROOT, file);
      if (HEX_CHECK_EXEMPT.has(rel)) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      const matches = code.matchAll(INLINE_HEX_REGEX);
      for (const m of matches) {
        // m[0] is the quoted hex. Strip quotes, lowercase.
        const hex = m[0].slice(1, -1).toLowerCase();
        if (SPANDA_PALETTE_HEXES.has(hex)) continue;
        offenders.push(`${rel}: ${m[0]}`);
      }
    }
    expect(
      offenders,
      `Inline non-palette hex literals found:\n  ${offenders.join("\n  ")}\n` +
        "Move to var(--color-*) tokens. The full palette is at src/design-system/colors_and_type.css.",
    ).toEqual([]);
  });
});
