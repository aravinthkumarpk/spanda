/**
 * label-filter — pure filter function + URL-state helpers for the
 * label-checkbox-group in filter-bar.tsx.
 *
 * Filter semantics (per phase2.html locked decision):
 *   - Multi-label selection uses OR (beat included if it has ANY selected label)
 *   - Empty selection returns the full set unchanged
 *   - Labels grouped by namespace prefix (work:* first, then with:*,
 *     chasing:*, then others)
 *
 * URL state: ?labels=work:do,with:khilan,chasing:pratul
 *
 * Hermetic.
 */

import { describe, expect, it } from "vitest";
import {
  collectLabels,
  filterBeatsByLabels,
  groupLabels,
  parseLabelsParam,
  serializeLabelsParam,
} from "@/lib/label-filter";

interface MiniBeat {
  id: string;
  labels: string[];
}

const beats: MiniBeat[] = [
  { id: "a", labels: ["work:do"] },
  { id: "b", labels: ["work:coordinate", "with:khilan"] },
  { id: "c", labels: ["work:followup", "chasing:pratul"] },
  { id: "d", labels: ["work:decide"] },
  { id: "e", labels: [] },
  { id: "f", labels: ["work:do", "with:khilan"] },
];

describe("filterBeatsByLabels: OR semantics", () => {
  it("empty selection returns the full set", () => {
    expect(filterBeatsByLabels(beats, []).map((b) => b.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("single label includes beats with that label", () => {
    expect(filterBeatsByLabels(beats, ["work:do"]).map((b) => b.id)).toEqual(["a", "f"]);
  });

  it("two labels = OR (union of matches)", () => {
    expect(
      filterBeatsByLabels(beats, ["work:do", "work:coordinate"]).map((b) => b.id),
    ).toEqual(["a", "b", "f"]);
  });

  it("excludes beats with no labels when selection is non-empty", () => {
    expect(filterBeatsByLabels(beats, ["work:do"]).map((b) => b.id)).not.toContain("e");
  });

  it("with:khilan finds both 'b' (coord) and 'f' (do)", () => {
    expect(filterBeatsByLabels(beats, ["with:khilan"]).map((b) => b.id)).toEqual(["b", "f"]);
  });

  it("unknown label returns empty set", () => {
    expect(filterBeatsByLabels(beats, ["work:nonexistent"])).toEqual([]);
  });

  it("preserves the input order (stable sort)", () => {
    expect(
      filterBeatsByLabels(beats, ["work:do", "work:followup"]).map((b) => b.id),
    ).toEqual(["a", "c", "f"]);
  });
});

describe("collectLabels: unique labels across a beat set", () => {
  it("returns each unique label exactly once", () => {
    const labels = collectLabels(beats);
    expect(labels).toContain("work:do");
    expect(labels).toContain("work:coordinate");
    expect(labels).toContain("with:khilan");
    expect(labels).toContain("chasing:pratul");
    // No dupes:
    const counts = labels.reduce<Record<string, number>>((acc, l) => {
      acc[l] = (acc[l] ?? 0) + 1;
      return acc;
    }, {});
    for (const [label, count] of Object.entries(counts)) {
      expect(count, `${label} appears ${count} times`).toBe(1);
    }
  });

  it("returns empty array when no beats have labels", () => {
    expect(collectLabels([{ id: "x", labels: [] }])).toEqual([]);
  });
});

describe("groupLabels: namespace ordering (work:* first, etc.)", () => {
  it("orders by namespace prefix: work:*, then with:*, then chasing:*, then others", () => {
    const labels = ["chasing:pratul", "with:khilan", "work:do", "g0", "work:coordinate"];
    const groups = groupLabels(labels);
    const flat = groups.flatMap((g) => g.labels);
    expect(flat.indexOf("work:do")).toBeLessThan(flat.indexOf("with:khilan"));
    expect(flat.indexOf("with:khilan")).toBeLessThan(flat.indexOf("chasing:pratul"));
    expect(flat.indexOf("chasing:pratul")).toBeLessThan(flat.indexOf("g0"));
  });

  it("each group has a heading and a label list", () => {
    const groups = groupLabels(["work:do", "with:khilan", "g0"]);
    expect(groups.find((g) => g.label === "work")).toBeDefined();
    expect(groups.find((g) => g.label === "with")).toBeDefined();
    expect(groups.find((g) => g.label === "other")).toBeDefined();
  });

  it("alphabetises labels within each group", () => {
    const labels = ["work:followup", "work:coordinate", "work:do", "work:decide"];
    const groups = groupLabels(labels);
    const workGroup = groups.find((g) => g.label === "work");
    expect(workGroup?.labels).toEqual(["work:coordinate", "work:decide", "work:do", "work:followup"]);
  });
});

describe("URL-state serializers", () => {
  it("serializeLabelsParam joins with commas", () => {
    expect(serializeLabelsParam(["work:do", "with:khilan"])).toBe("work:do,with:khilan");
  });

  it("serializeLabelsParam returns null for empty selection", () => {
    expect(serializeLabelsParam([])).toBeNull();
  });

  it("parseLabelsParam splits comma-separated string into trimmed entries", () => {
    expect(parseLabelsParam("work:do,with:khilan, chasing:pratul"))
      .toEqual(["work:do", "with:khilan", "chasing:pratul"]);
  });

  it("parseLabelsParam returns empty array for null / empty", () => {
    expect(parseLabelsParam(null)).toEqual([]);
    expect(parseLabelsParam("")).toEqual([]);
  });

  it("parseLabelsParam round-trips through serializeLabelsParam", () => {
    const input = ["work:do", "with:khilan", "chasing:pratul"];
    expect(parseLabelsParam(serializeLabelsParam(input))).toEqual(input);
  });
});
