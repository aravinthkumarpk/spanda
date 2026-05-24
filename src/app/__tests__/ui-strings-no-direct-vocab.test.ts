/**
 * Architectural lint: no JSX uses raw musical-metaphor vocab.
 *
 * After ui-vocab lands, every user-facing string should go through
 * useVocab() instead of being a literal "Take!" / "Beat" / "Setlist" /
 * etc. This test fails if a refactor leaves a stray literal in src/
 * components or pages.
 *
 * Hermetic — pure file walk + regex.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const COMPONENTS = path.join(ROOT, "src", "components");
const APP = path.join(ROOT, "src", "app");

/** Recursively collect .tsx files. */
function tsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "__tests__") continue;
      if (entry === "__manual_tests__") continue;
      if (entry === "__fixtures__") continue;
      tsxFiles(full, acc);
    } else if (full.endsWith(".tsx") && !full.endsWith(".stories.tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Files explicitly exempt from this rule.
 *
 *  - ui-vocab.ts itself (it's where the literals live).
 *  - use-vocab.ts (the hook).
 *  - storybook files (separately tested in the storybook project).
 *  - legacy upstream files we don't want to touch.
 *
 *  Anything else with a raw "Take!"/"Beat"/etc. in a JSX context fails. */
const EXEMPT_FILES = new Set<string>([
  "src/lib/ui-vocab.ts",
  "src/hooks/use-vocab.ts",
  // Data/utility files that EMIT vocab keys as return values or data
  // entries. The render site that consumes these IS required to wrap
  // them in useVocab() — checked downstream, not here. Adding these
  // to the lint corpus would require a deeper "find the render site"
  // walk that isn't worth the lint complexity.
  "src/components/agent-history-utils.tsx",
  "src/components/settings-actions-section.tsx",
]);

/** Strip TS comments. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/** Vocab strings that should always go through useVocab().
 *  We match them as string literals inside JSX expressions or as
 *  text nodes. Conservative: only the imperative "Take!" / "Scene!"
 *  with the bang (most clearly user-facing). */
const DIRECT_VOCAB_REGEX = /(?:^|[\s>{(])(["'`])(Take!|Scene!)\1/g;

const FILES = tsxFiles(COMPONENTS).concat(tsxFiles(APP));

describe("architectural lint: no JSX literal musical-vocab in components", () => {
  it("source corpus discovered", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(50);
  });

  it("zero raw 'Take!' / 'Scene!' literals in src/components or src/app .tsx files", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = path.relative(ROOT, file);
      if (EXEMPT_FILES.has(rel)) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      // Walk line-by-line so we can skip lines that are LEGITIMATE
      // consumers (call vocab() or a single-letter v() — the canonical
      // useVocab hook return — with the literal as an argument).
      const lines = code.split("\n");
      lines.forEach((line, idx) => {
        if (/\bvocab\s*\(/.test(line) || /\bv\s*\(\s*["'`]/.test(line)) {
          return;  // legitimate consumer site
        }
        const matches = line.matchAll(DIRECT_VOCAB_REGEX);
        for (const m of matches) {
          offenders.push(`${rel}:${idx + 1}: ${m[0].trim()}`);
        }
      });
    }
    expect(
      offenders,
      `Direct musical-vocab literals found:\n  ${offenders.join("\n  ")}\n` +
        "Wrap them in useVocab(): const v = useVocab(); <button>{v('Take!')}</button>.",
    ).toEqual([]);
  });
});
