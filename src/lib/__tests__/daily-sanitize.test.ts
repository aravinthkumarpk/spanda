/**
 * F5 (iteration 2.2) — the daily-review HTML is embedded cleanly: its own
 * chrome (lockup/nav/footer) is stripped so there's one app bar, and its CSS
 * is scoped under `.daily-content` so it can't clash with the app shell.
 */

import { describe, expect, it } from "vitest";
import {
  stripDailyChrome,
  scopeCss,
  sanitizeDaily,
} from "@/lib/daily-sanitize";

describe("stripDailyChrome", () => {
  it("removes the daily's header/nav/footer, keeps content", () => {
    const html = `<header class="top">spanda<nav>Today</nav></header>`
      + `<section class="card">real content</section>`
      + `<footer>foot</footer>`;
    const out = stripDailyChrome(html);
    expect(out).toContain("real content");
    expect(out).not.toContain("spanda");
    expect(out).not.toContain("foot");
    expect(out).not.toContain("<header");
  });
});

describe("scopeCss", () => {
  it("prefixes plain selectors with the scope", () => {
    expect(scopeCss(".card { color: red }", ".daily-content")).toContain(
      ".daily-content .card",
    );
  });

  it("maps body/:root onto the scope container (no global leak)", () => {
    const out = scopeCss("body { margin: 0 } :root { --x: 1px }", ".dc");
    expect(out).toContain(".dc {");
    expect(out).not.toMatch(/(^|\s)body\s*\{/);
  });

  it("scopes rules inside @media, keeps the wrapper", () => {
    const out = scopeCss("@media (min-width: 700px) { .x { top: 0 } }", ".dc");
    expect(out).toContain("@media (min-width: 700px)");
    expect(out).toContain(".dc .x");
  });

  it("leaves @keyframes / @font-face selectors untouched", () => {
    const out = scopeCss("@keyframes spin { from { top: 0 } }", ".dc");
    expect(out).toContain("@keyframes spin");
    expect(out).not.toContain(".dc from");
  });
});

describe("sanitizeDaily", () => {
  const doc = `<!doctype html><html><head>
    <style>body{margin:0} .card{color:red}</style>
    </head><body>
    <header class="top"><span>spanda</span></header>
    <section class="card">today content</section>
    </body></html>`;

  it("returns chrome-free content and scoped css", () => {
    const { content, css } = sanitizeDaily(doc);
    expect(content).toContain("today content");
    expect(content).not.toContain("spanda");
    expect(content).not.toContain("<style");
    expect(css).toContain(".daily-content .card");
    expect(css).toContain(".daily-content {");
  });
});
