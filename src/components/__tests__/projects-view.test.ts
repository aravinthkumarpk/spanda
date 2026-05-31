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
