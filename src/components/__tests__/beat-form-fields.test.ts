/**
 * A4 (iteration 02) — the add-task form offers exactly the four spanda task
 * types (Do / Decide / Coordinate / Follow-up), each mapping to a beads
 * profileId, and only those that the active backend actually exposes. Legacy
 * profiles (autopilot, semiauto, …) never surface as a task type.
 */

import { describe, expect, it } from "vitest";
import {
  SPANDA_TASK_TYPES,
  spandaTaskTypeOptions,
} from "@/components/beat-form-fields";
import { builtinWorkflowDescriptors } from "@/lib/workflows";
import type { MemoryWorkflowDescriptor } from "@/lib/types";

function descriptor(id: string): MemoryWorkflowDescriptor {
  return { id } as MemoryWorkflowDescriptor;
}

describe("spanda task types (A4)", () => {
  it("declares the four product task types mapped to profile ids", () => {
    expect(SPANDA_TASK_TYPES.map((t) => t.profileId)).toEqual([
      "do",
      "decide",
      "coordinate",
      "followup",
    ]);
    expect(SPANDA_TASK_TYPES.map((t) => t.label)).toEqual([
      "Do",
      "Decide",
      "Coordinate",
      "Follow-up",
    ]);
  });

  it("offers all four types on the builtin (beads) backend", () => {
    const options = spandaTaskTypeOptions(builtinWorkflowDescriptors());
    expect(options.map((o) => o.profileId)).toEqual([
      "do",
      "decide",
      "coordinate",
      "followup",
    ]);
  });

  it("filters to only the types the backend exposes; hides legacy profiles", () => {
    const knotsLike = [
      descriptor("autopilot"),
      descriptor("semiauto"),
      descriptor("do"),
    ];
    const options = spandaTaskTypeOptions(knotsLike);
    expect(options.map((o) => o.profileId)).toEqual(["do"]);
  });

  it("returns nothing when no spanda task type is available (fallback path)", () => {
    const legacyOnly = [descriptor("autopilot"), descriptor("semiauto")];
    expect(spandaTaskTypeOptions(legacyOnly)).toEqual([]);
  });
});
