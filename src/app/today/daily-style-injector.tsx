"use client";

import { useEffect } from "react";

/**
 * Injects the daily's scoped CSS into <head> imperatively, OUTSIDE React.
 *
 * Why not just render a <style>? React 19 treats <style> as a hoistable
 * resource: a standalone <style> element (even one embedded in a
 * dangerouslySetInnerHTML blob) gets relocated and then DROPPED on client
 * hydration — the SSR HTML is styled, the live DOM is bare. That cost us two
 * iterations of "the CSS is right there but nothing applies".
 *
 * Creating the node with document.createElement and setting `.textContent`
 * (never parsed as HTML, never escaped) means React has no React-element to
 * reconcile, hoist, or drop. The node lives in <head>, the daily's
 * `.daily-content`-scoped rules match the content div, and it just works.
 * One-frame FOUC on first paint is the only tradeoff, and it's worth it for a
 * delivery path that can't be undone by the framework.
 */
const STYLE_ID = "daily-scoped-css";

export function DailyStyleInjector({ css }: { css: string }) {
  useEffect(() => {
    if (!css) return;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [css]);

  return null;
}
