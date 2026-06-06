/**
 * F4 (iteration 2.2) — on the Projects view, the project's primary click opens
 * the Board SCOPED to that project (not the bead editor); editing is a
 * secondary affordance; and a truncated child list offers "view all".
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectsView } from "@/components/projects-view";
import type { Beat } from "@/lib/types";

function beat(id: string, overrides: Partial<Beat> = {}): Beat {
  return {
    id,
    title: id,
    type: "work",
    state: "ready_for_implementation",
    profileId: "do",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

// A project (no parent + children) with one initiative + task under it.
const beats: Beat[] = [
  beat("proj", { title: "Launch" }),
  beat("init", { parent: "proj" }),
  beat("task", { parent: "init" }),
];

function render(): string {
  return renderToStaticMarkup(
    createElement(ProjectsView, {
      isLoading: false,
      loadError: null,
      beats,
      onOpenBeat: () => {},
    }),
  );
}

describe("ProjectsView — project card (F4)", () => {
  it("the project's primary link opens the SCOPED board", () => {
    const html = render();
    expect(html).toContain(
      'href="/beats?view=board&amp;project=proj"',
    );
  });

  it("offers a secondary edit (details) affordance, not a primary one", () => {
    const html = render();
    expect(html).toContain("Edit project details");
  });
});

function renderBeats(bs: Beat[]): string {
  return renderToStaticMarkup(
    createElement(ProjectsView, {
      isLoading: false,
      loadError: null,
      beats: bs,
      onOpenBeat: () => {},
    }),
  );
}

describe("ProjectsView — variant A (expanded, priority-sorted, focus + due)", () => {
  it("orders projects high->low priority regardless of input order", () => {
    const html = renderBeats([
      beat("beta", { title: "BetaProj", priority: 1 }),
      beat("b1", { parent: "beta" }),
      beat("alpha", { title: "AlphaProj", priority: 0 }),
      beat("a1", { parent: "alpha" }),
    ]);
    expect(html.indexOf("AlphaProj")).toBeLessThan(html.indexOf("BetaProj"));
  });

  it("orders initiatives within a project high->low priority", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("ib", { parent: "p", priority: 1, title: "InitBeta" }),
      beat("ibx", { parent: "ib" }),
      beat("ia", { parent: "p", priority: 0, title: "InitAlpha" }),
      beat("iax", { parent: "ia" }),
    ]);
    expect(html.indexOf("InitAlpha")).toBeLessThan(html.indexOf("InitBeta"));
  });

  it("marks a focus-labelled initiative and shows the focus strip", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("fi", { parent: "p", title: "ShipTheThing", labels: ["focus"] }),
      beat("fix", { parent: "fi" }),
    ]);
    expect(html).toContain('data-focus="true"');
    expect(html).toContain("Focus");
  });

  it("shows the empty-focus prompt when nothing is focused", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("i", { parent: "p", title: "SomeInit" }),
      beat("ix", { parent: "i" }),
    ]);
    expect(html).not.toContain('data-focus="true"');
    expect(html.toLowerCase()).toContain("daily review");
  });

  it("renders a due date with an overdue tone", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("i", { parent: "p", title: "DueInit", due: "2020-01-01" }),
      beat("ix", { parent: "i" }),
    ]);
    expect(html).toContain('data-due-tone="overdue"');
  });

  it("renders an aligned Due column header", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("i", { parent: "p", title: "AnInit" }),
      beat("ix", { parent: "i" }),
    ]);
    expect(html).toContain(">Due<");
  });
});

describe("ProjectsView — do-focus (the 'build today' strip)", () => {
  it("marks a focus:do initiative and shows the Do top-5 strip", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("di", { parent: "p", title: "BuildThis", labels: ["focus:do"] }),
      beat("dix", { parent: "di" }),
    ]);
    expect(html).toContain('data-do-focus="true"');
    expect(html.toLowerCase()).toContain("do top-5");
  });

  it("lets a row carry both the milestone focus and the do-focus flag", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("bi", {
        parent: "p",
        title: "BothFlags",
        labels: ["focus", "focus:do"],
      }),
      beat("bix", { parent: "bi" }),
    ]);
    expect(html).toContain('data-focus="true"');
    expect(html).toContain('data-do-focus="true"');
  });

  it("shows an empty do-focus prompt when nothing is do-focused", () => {
    const html = renderBeats([
      beat("p", { title: "Proj" }),
      beat("i", { parent: "p", title: "PlainInit" }),
      beat("ix", { parent: "i" }),
    ]);
    expect(html).not.toContain('data-do-focus="true"');
    expect(html.toLowerCase()).toContain("execute");
  });
});

describe("ProjectsView — active-only rollup", () => {
  it("excludes terminal (shipped/closed) beats so cards show active work", () => {
    const withDone: Beat[] = [
      beat("p", { title: "ProjA" }),
      beat("live", { parent: "p", title: "LIVE TASK" }),
      beat("done", { parent: "p", title: "DONE TASK", state: "shipped" }),
    ];
    const html = renderToStaticMarkup(
      createElement(ProjectsView, {
        isLoading: false,
        loadError: null,
        beats: withDone,
        onOpenBeat: () => {},
      }),
    );
    expect(html).toContain("LIVE TASK");
    expect(html).not.toContain("DONE TASK");
  });
});
