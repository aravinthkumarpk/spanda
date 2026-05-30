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

const FALLBACK_WINDOW_DAYS = 7;

export interface DailyLoaderFs {
  exists: (path: string) => boolean;
  read: (path: string) => string;
}

export interface DailyLoadResult {
  /** The extracted body content, ready to inline. */
  body: string;
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
  /**
   * IANA timezone for the date walk (e.g. "Asia/Kolkata", "UTC").
   * Required, no default — the daily-review pipeline writes files keyed to
   * an IST clock, but other deployments may differ. Callers must be explicit
   * about whose clock they're reading from. Per CLAUDE.md "Fail Loudly":
   * a silent UTC default would hide config drift the day someone runs this
   * for a non-IST pipeline.
   */
  timezone: string;
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
 * Compute the Y/M/D in the requested IANA timezone for a given moment.
 * Hermetic — relies on Node's built-in ICU via Intl.DateTimeFormat.
 * No real fs / network / wall-clock.
 *
 * Throws with the greppable `SPANDA DAILY LOADER` marker (per CLAUDE.md
 * "Fail Loudly") if the timezone is invalid. The raw RangeError from
 * Intl is opaque ("Invalid time zone specified") and easy to miss in
 * server logs; wrapping it makes a misconfigured SPANDA_DAILY_TZ surface
 * as a named subsystem failure instead.
 */
function ymdInTimezone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `SPANDA DAILY LOADER: invalid timezone '${timezone}'. ` +
        `Set SPANDA_DAILY_TZ to a valid IANA identifier (e.g. 'Asia/Kolkata'). ` +
        `Underlying: ${cause}`,
    );
  }
  const parts = fmt.formatToParts(date);
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`SPANDA DAILY LOADER: Intl returned no '${type}' part`);
    }
    return Number(part.value);
  };
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Anchor a Y/M/D triple as a UTC-midnight Date so we can iterate days
 * with `setUTCDate(... - 1)` without crossing any DST/UTC boundary.
 * The Date's UTC components match the input Y/M/D; the wall-clock
 * meaning of that Date in the original timezone is irrelevant — we only
 * use it as a counter that path-builders read via getUTC*.
 */
function utcAnchorFor(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Load today's daily HTML from disk and prepare it for inlining.
 * Falls back to the most-recent prior daily within the FALLBACK_WINDOW_DAYS
 * window. Throws a clearly-named error if no daily is found at all.
 *
 * The 'today' starting point is computed in the caller-supplied timezone
 * so a late-UTC moment that's already next-day in IST loads the IST file.
 */
export function loadDailyHtml(opts: LoadDailyHtmlOptions): DailyLoadResult {
  const { root, now, fs, timezone } = opts;
  const { year, month, day } = ymdInTimezone(now, timezone);
  const startAnchor = utcAnchorFor(year, month, day);
  for (let offset = 0; offset <= FALLBACK_WINDOW_DAYS; offset++) {
    const date = new Date(startAnchor);
    date.setUTCDate(date.getUTCDate() - offset);
    const path = buildDailyPath(root, date);
    if (!fs.exists(path)) continue;
    const html = fs.read(path);
    return {
      body: extractBodyContent(html),
      usedDate: formatYMD(date),
      fellBack: offset > 0,
      title: extractTitle(html),
    };
  }
  throw new Error(
    `no daily found in ${root} within ${FALLBACK_WINDOW_DAYS} days of ${formatYMD(startAnchor)}`,
  );
}
