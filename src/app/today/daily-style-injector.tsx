"use client";

import { useEffect } from "react";

/**
 * Injects the daily's scoped CSS into <head> imperatively, OUTSIDE React, and
 * reports diagnostics to console + a visible #daily-debug-client element.
 *
 * Why imperative: React 19 treats <style> as a hoistable resource and drops it
 * on client hydration wherever it appears in the tree (even inside a
 * dangerouslySetInnerHTML blob). document.createElement + textContent gives a
 * node React has no handle on, so it can't be relocated or dropped.
 *
 * The diagnostics are temporary (debugging why the page renders unstyled): they
 * make the client-side execution path visible without needing the user's
 * devtools — did JS run, did css arrive, did the style land in <head>, do the
 * scoped selectors match real elements.
 */
const STYLE_ID = "daily-scoped-css";

export function DailyStyleInjector({ css }: { css: string }) {
  useEffect(() => {
    const report = (msg: string) => {
      console.log("[daily-css]", msg);
      const el = document.getElementById("daily-debug-client");
      if (el) el.textContent = msg;
    };
    try {
      if (!css) {
        report("client: css EMPTY — prop did not arrive");
        return;
      }
      let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;

      const inHead = document.head.contains(styleEl);
      // Did the browser PARSE the sheet? (selector matching != rule applied)
      let ruleCount = -1;
      try {
        ruleCount = styleEl.sheet ? styleEl.sheet.cssRules.length : -2;
      } catch {
        ruleCount = -3; // cross-origin / access error
      }
      // Does the rule COMPUTE on a real .lane?
      const lane = document.querySelector(
        ".daily-content .lane",
      ) as HTMLElement | null;
      const dc = document.querySelector(".daily-content") as HTMLElement | null;
      const cs = lane ? getComputedStyle(lane) : null;
      const canvas = dc
        ? getComputedStyle(dc).getPropertyValue("--color-canvas").trim()
        : "n/a";
      report(
        `client OK: css=${css.length}b · in-head=${inHead} · ` +
          `cssRules=${ruleCount} · lane{display=${cs?.display} ` +
          `pad=${cs?.padding} bg=${cs?.backgroundColor}} · --color-canvas="${canvas}"`,
      );
    } catch (err) {
      report(
        "client ERROR: " + (err instanceof Error ? err.message : String(err)),
      );
    }
    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [css]);

  return null;
}
