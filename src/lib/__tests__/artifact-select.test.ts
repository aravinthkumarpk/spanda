/**
 * selectArtifactBeats: which beats appear on /artifacts — every bead
 * carrying the `artifact` label that is still active, priority-first.
 */
import { describe, expect, it } from "vitest";

import { selectArtifactBeats } from "@/lib/artifact-select";
import type { Beat } from "@/lib/types";

function beat(partial: Partial<Beat>): Beat {
  return {
    id: "x",
    title: "t",
    state: "ready_for_implementation",
    priority: 2,
    labels: [],
    created: "2026-01-01T00:00:00Z",
    updated: "2026-01-01T00:00:00Z",
    ...partial,
  } as Beat;
}

describe("selectArtifactBeats", () => {
  it("keeps active artifact-labelled beats, priority-sorted; drops the rest", () => {
    const beats = [
      beat({ id: "no-label", priority: 0 }),
      beat({ id: "low", labels: ["artifact"], priority: 2 }),
      beat({ id: "done", labels: ["artifact"], state: "shipped", priority: 0 }),
      beat({ id: "high", labels: ["artifact"], priority: 0 }),
    ];
    expect(selectArtifactBeats(beats).map((b) => b.id)).toEqual([
      "high",
      "low",
    ]);
  });
});
