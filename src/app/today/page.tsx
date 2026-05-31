// /today — server component that inlines the day's daily HTML
// inside the spanda app shell.
//
// Reads ${DAILY_ROOT}/YYYY/MM/DD.html from disk on the same VPS as
// the existing personal-os daily-review pipeline. Falls back to the
// most-recent prior daily within 7 days; renders an empty state if
// no daily found at all.
//
// Per phase2.html locked decision: server-side disk read, NOT
// HTTP fetch or iframe embed.

import { existsSync, readFileSync } from "node:fs";
import { loadDailyHtml, type DailyLoaderFs } from "@/lib/daily-loader";
import { PromoteIsland } from "@/components/promote-island";
import { DailyStyleInjector } from "./daily-style-injector";

// Configurable root. Default mirrors the live VPS path used by the
// daily-review pipeline; override with SPANDA_DAILY_ROOT for tests
// or alternate deployments.
const DAILY_ROOT = process.env.SPANDA_DAILY_ROOT
  || "/home/deploy/code/html-artifacts/docs/daily";

const realFs: DailyLoaderFs = {
  exists: (path) => existsSync(path),
  read: (path) => readFileSync(path, "utf8"),
};

export default async function TodayPage() {
  let body = "";
  let css = "";
  let usedDate = "";
  let fellBack = false;
  let loadError: string | null = null;

  try {
    const result = loadDailyHtml({
      root: DAILY_ROOT,
      now: new Date(),
      fs: realFs,
    });
    body = result.body;
    css = result.css;
    usedDate = result.usedDate;
    fellBack = result.fellBack;
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <main className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto rounded-2xl bg-paper-50 p-8 text-center">
          <p className="text-ink-700 text-base">
            No daily review found in the last 7 days.
          </p>
          <p className="text-ink-500 text-sm mt-2 font-mono">{loadError}</p>
          <p className="text-ink-700 text-sm mt-4">
            Run the personal-os daily-review pipeline to generate today&apos;s file.
          </p>
        </div>
      </main>
    );
  }

  // F5: the daily is a complete, self-styled document. We strip its standalone
  // chrome and scope its CSS under .daily-content (so it can't clash with the
  // app shell), then let it render FULL-BLEED and own its own layout — its
  // `.page` centers + pads, its `--bg-page` fills the content area. We add NO
  // second header or date caption: the daily's own hero already shows the date
  // and title, so a caption would just duplicate it. One app bar, then the
  // daily exactly as designed.
  return (
    <main className="min-h-screen">
      {fellBack && usedDate && (
        <div className="flex items-center gap-2 border-b border-paper-200 bg-paper-50 px-6 py-2 text-sm text-ink-500">
          <span
            className="inline-block h-2 w-2 rounded-full bg-ochre-500"
            aria-hidden
          />
          Showing the most recent daily — {usedDate}
        </div>
      )}
      {/* CSS delivery is OUTSIDE React: the injector creates a <style> in
          <head> imperatively (document.createElement + textContent), so React
          has no <style> element to hoist/dedupe/drop on hydration — the failure
          mode that left the page bare twice. The content div carries ONLY the
          body HTML; no <style> anywhere in the React tree. */}
      <DailyStyleInjector css={css} />
      <div className="daily-content" dangerouslySetInnerHTML={{ __html: body }} />
      {usedDate && (
        <div className="mx-auto max-w-[1240px] px-8 pb-12">
          <PromoteIsland sourceDate={usedDate} />
        </div>
      )}
    </main>
  );
}
