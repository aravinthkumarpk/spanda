/**
 * A3 (iteration 02) — scoping the Board to a project returns the project plus
 * every descendant (initiatives and their tasks), to any depth, and nothing
 * outside the subtree.
 */

import { describe, expect, it } from "vitest";
import { filterToProjectDescendants } from "@/lib/project-scope-filter";
import type { Beat } from "@/lib/types";

function beat(id: string, parent?: string): Beat {
  return {
    id,
    title: id,
    type: "work",
    state: "ready_for_implementation",
    priority: 2,
    labels: [],
    parent,
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
  };
}

describe("filterToProjectDescendants", () => {
  // P → (I1 → T1, T2), I2 ; and an unrelated project Q → T3
  const beats = [
    beat("P"),
    beat("I1", "P"),
    beat("T1", "I1"),
    beat("T2", "I1"),
    beat("I2", "P"),
    beat("Q"),
    beat("T3", "Q"),
  ];

  it("includes the project and all descendants to any depth", () => {
    const ids = filterToProjectDescendants(beats, "P").map((b) => b.id);
    expect(ids.sort()).toEqual(["I1", "I2", "P", "T1", "T2"]);
  });

  it("excludes beats outside the subtree", () => {
    const ids = filterToProjectDescendants(beats, "P").map((b) => b.id);
    expect(ids).not.toContain("Q");
    expect(ids).not.toContain("T3");
  });

  it("scopes to a mid-tree node's own subtree", () => {
    const ids = filterToProjectDescendants(beats, "I1").map((b) => b.id);
    expect(ids.sort()).toEqual(["I1", "T1", "T2"]);
  });

  it("returns nothing when the project id is absent (no silent show-all)", () => {
    expect(filterToProjectDescendants(beats, "nope")).toEqual([]);
  });

  it("preserves input order", () => {
    const ids = filterToProjectDescendants(beats, "P").map((b) => b.id);
    expect(ids).toEqual(["P", "I1", "T1", "T2", "I2"]);
  });

  it("is cycle-safe", () => {
    const cyclic = [beat("A", "B"), beat("B", "A")];
    // Neither is a clean root, but scoping to A must terminate and include both.
    const ids = filterToProjectDescendants(cyclic, "A").map((b) => b.id).sort();
    expect(ids).toEqual(["A", "B"]);
  });
});
