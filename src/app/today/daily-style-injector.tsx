"use client";

import { useEffect } from "react";

/**
 * Injects the daily's scoped CSS into <head> imperatively, OUTSIDE React.
 *
 * React 19 treats a <style> element as a hoistable resource and can relocate
 * or drop it on client hydration wherever it appears in the tree (even inside
 * a dangerouslySetInnerHTML blob). Creating the node with document.createElement
 * and setting `.textContent` (raw CSS, never parsed as HTML, never escaped)
 * gives a node React has no handle on, so it can't be relocated or dropped.
 * The rules are scoped to `.daily-content`, which wraps the content div.
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
