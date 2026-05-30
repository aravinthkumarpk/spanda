/**
 * A5 (iteration 02) — the view switcher shows four primary surfaces (Today /
 * Board / Projects / Review) plus a "More" menu that holds the secondary
 * views. This keeps the bar legible instead of spilling ten tabs across the
 * header. Today links to its own route; the rest switch the view param.
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ViewSwitcherTabs } from "@/components/app-header-view-tabs";

function render(): string {
  return renderToStaticMarkup(
    createElement(ViewSwitcherTabs, {
      beatsView: "board",
      setView: () => {},
      escalationsCount: 0,
    }),
  );
}

describe("ViewSwitcherTabs primary bar", () => {
  it("renders the four primary surfaces", () => {
    const html = render();
    expect(html).toContain("Today");
    expect(html).toContain("Board");
    expect(html).toContain("Projects");
    expect(html).toContain("Review");
  });

  it("exposes a More menu instead of spilling every view", () => {
    const html = render();
    expect(html).toContain("More");
  });

  it("Today links to the /today route", () => {
    const html = render();
    expect(html).toContain('href="/today"');
  });

  it("keeps secondary views out of the primary bar (they live under More)", () => {
    // The dropdown content renders in a portal, so the closed menu's items are
    // not in the static markup — proving they're not primary tabs.
    const html = render();
    expect(html).not.toContain("Diagnostics");
    expect(html).not.toContain("Setlist");
  });
});
