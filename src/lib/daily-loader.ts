// daily-loader — reads the existing daily HTML from disk and prepares
// it for inlining inside the spanda /today route.
//
// Per phase2.html spec: Spanda's /today route is a server component
// that reads ${DAILY_ROOT}/YYYY/MM/DD.html (where DAILY_ROOT is the
// existing personal-os daily output, eg ~/code/html-artifacts/docs/
// daily) and inlines the body in spanda chrome.
//
// The daily-review pipeline already writes here on a cron; spanda
// just consumes whatever's freshest.
//
// All fs interaction goes through the injected DailyLoaderFs interface
// so this module stays hermetic-testable (no real fs reads).

import { sanitizeDaily } from "@/lib/daily-sanitize";

const FALLBACK_WINDOW_DAYS = 7;

export interface DailyLoaderFs {
  exists: (path: string) => boolean;
  read: (path: string) => string;
}

export interface DailyLoadResult {
  /** Chrome-free body content, ready to inline in `.daily-content` (F5). */
  body: string;
  /** The daily's CSS, scoped under `.daily-content` so it can't clash (F5). */
  css: string;
  /** The date whose file was loaded, as YYYY-MM-DD. */
  usedDate: string;
  /** True if the loader fell back to a prior day (today's file missing). */
  fellBack: boolean;
  /** Page title from <head><title> if present, else null. */
  title: string | null;
}

export interface LoadDailyHtmlOptions {
  /** Absolute path to the daily root. e.g. /home/deploy/code/html-artifacts/docs/daily */
  root: string;
  /** Current time, for deterministic tests. */
  now: Date;
  /** Injected fs adapter — pure-fn tests pass an in-memory map. */
  fs: DailyLoaderFs;
}

/** Build the canonical daily path for a date: ${root}/YYYY/MM/DD.html */
export function buildDailyPath(root: string, date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${root}/${y}/${m}/${d}.html`;
}

/** Format a Date as YYYY-MM-DD (UTC) for display + comparison. */
function formatYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Strip `<html>` / `<head>` / `<body>` wrapper from a full HTML document.
 * Hoists any `<head><style>` blocks INTO the extracted body so the daily's
 * inline styles still render when inlined into the spanda app shell.
 *
 * Returns the input verbatim if no <body> tag is present (defensive — for
 * the case where someone already passes a fragment).
 */
export function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html;
  const bodyInner = bodyMatch[1];
  // Hoist head styles inside the body.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return bodyInner;
  const headStyles = Array.from(
    headMatch[1].matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi),
  ).map((m) => m[0]).join("");
  return headStyles + bodyInner;
}

/** Extract the document title from <head><title> if present. */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Load today's daily HTML from disk and prepare it for inlining.
 * Falls back to the most-recent prior daily within the FALLBACK_WINDOW_DAYS
 * window. Throws a clearly-named error if no daily is found at all.
 */
export function loadDailyHtml(opts: LoadDailyHtmlOptions): DailyLoadResult {
  const { root, now, fs } = opts;
  for (let offset = 0; offset <= FALLBACK_WINDOW_DAYS; offset++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const path = buildDailyPath(root, date);
    if (!fs.exists(path)) continue;
    const html = fs.read(path);
    // F5: strip the daily's own chrome + scope its CSS (clean embed) rather
    // than hoisting unscoped styles via extractBodyContent.
    const { content, css } = sanitizeDaily(html);
    return {
      body: content,
      css,
      usedDate: formatYMD(date),
      fellBack: offset > 0,
      title: extractTitle(html),
    };
  }
  throw new Error(
    `no daily found in ${root} within ${FALLBACK_WINDOW_DAYS} days of ${formatYMD(now)}`,
  );
}
