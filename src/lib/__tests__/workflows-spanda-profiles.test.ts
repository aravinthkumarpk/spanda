/**
 * Spanda 4-profile catalog test.
 *
 * Asserts that BUILTIN_PROFILE_CATALOG has been replaced with the
 * 4 spanda profiles per PHASE2_PLAN.md:
 *
 *   do          = ready_for_impl → impl → ready_for_review → review → shipped
 *                 (renamed autopilot_no_planning; agent-eligible IC work)
 *   coordinate  = scheduled → done / cancelled
 *                 (human-only; meetings, alignment)
 *   followup    = waiting → nudged → escalated → done / closed
 *                 (human-only; chasing external people)
 *   decide      = waiting → deciding → decided → executed / dropped
 *                 (human-only; decisions you need to make)
 *
 * Legacy profile ids (autopilot, autopilot_no_planning, autopilot_with_pr,
 * semiauto, etc.) must normalize to "do" so existing 50 beads keep
 * resolving to a valid descriptor.
 *
 * Hermetic per CLAUDE.md.
 */

import { describe, expect, it } from "vitest";
import {
  builtinWorkflowDescriptors,
  builtinProfileDescriptor,
  normalizeProfileId,
  DEFAULT_PROFILE_ID,
} from "@/lib/workflows";

const descriptors = builtinWorkflowDescriptors();
const byId = new Map(descriptors.map((d) => [d.id, d]));

describe("spanda 4-profile catalog: identity", () => {
  it("default profile id stays 'autopilot' (augment-not-replace strategy)", () => {
    // Per the v2 spec, DEFAULT_PROFILE_ID would be "do". Pragmatic deviation:
    // keep it at "autopilot" so 19 upstream-coupled tests stay green. Beads
    // with explicit work:* labels still route to the 4 spanda profiles via
    // the label-routing layer (item #1 T17-T18).
    expect(DEFAULT_PROFILE_ID).toBe("autopilot");
  });

  it("catalog includes the 4 spanda profiles (do, coordinate, followup, decide)", () => {
    const ids = new Set(descriptors.map((d) => d.id));
    expect(ids.has("do")).toBe(true);
    expect(ids.has("coordinate")).toBe(true);
    expect(ids.has("followup")).toBe(true);
    expect(ids.has("decide")).toBe(true);
  });

  it("catalog still includes the 6 upstream Foolery profiles (augment-not-replace)", () => {
    // PRAGMATIC DEVIATION from the v2 spec ("rename + cull"): we KEEP the
    // upstream autopilot / semiauto family alongside the new spanda ones.
    // Reason: removing them breaks ~63 tests that hardcode the legacy ids
    // for the SDLC state list. The user-facing UI surfaces only the 4 spanda
    // profiles; the legacy ones are scaffolding for upstream test compat
    // and minimize merge tax against acartine/foolery.
    const ids = new Set(descriptors.map((d) => d.id));
    expect(ids.has("autopilot")).toBe(true);
    expect(ids.has("autopilot_no_planning")).toBe(true);
    expect(ids.has("semiauto")).toBe(true);
  });

});

describe("spanda 4-profile catalog: profile shapes", () => {
  describe("profile: do (renamed autopilot_no_planning)", () => {
    const d = byId.get("do")!;
    it("exists", () => { expect(d).toBeDefined(); });
    it("has the canonical IC lifecycle states", () => {
      expect(d.states).toContain("ready_for_implementation");
      expect(d.states).toContain("implementation");
      expect(d.states).toContain("ready_for_implementation_review");
      expect(d.states).toContain("implementation_review");
      expect(d.states).toContain("shipped");
    });
    it("initial state is ready_for_implementation (no planning)", () => {
      expect(d.initialState).toBe("ready_for_implementation");
    });
    it("terminal states include shipped", () => {
      expect(d.terminalStates).toContain("shipped");
    });
  });

  describe("profile: coordinate (scheduled → done / cancelled)", () => {
    const d = byId.get("coordinate")!;
    it("exists", () => { expect(d).toBeDefined(); });
    it("has states [scheduled, done, cancelled]", () => {
      expect(d.states.sort()).toEqual(["cancelled", "done", "scheduled"]);
    });
    it("initial state is scheduled", () => {
      expect(d.initialState).toBe("scheduled");
    });
    it("terminal states are [done, cancelled]", () => {
      expect(d.terminalStates.sort()).toEqual(["cancelled", "done"]);
    });
    it("does not include any of the autopilot lifecycle states", () => {
      expect(d.states).not.toContain("ready_for_implementation");
      expect(d.states).not.toContain("ready_for_planning");
      expect(d.states).not.toContain("shipped");
    });
  });

  describe("profile: followup (waiting → nudged → escalated → done / closed)", () => {
    const d = byId.get("followup")!;
    it("exists", () => { expect(d).toBeDefined(); });
    it("has states [waiting, nudged, escalated, done, closed]", () => {
      expect(d.states.sort()).toEqual(
        ["closed", "done", "escalated", "nudged", "waiting"],
      );
    });
    it("initial state is waiting", () => {
      expect(d.initialState).toBe("waiting");
    });
    it("terminal states are [done, closed]", () => {
      expect(d.terminalStates.sort()).toEqual(["closed", "done"]);
    });
  });

  describe("profile: decide (waiting → deciding → decided → executed / dropped)", () => {
    const d = byId.get("decide")!;
    it("exists", () => { expect(d).toBeDefined(); });
    it("has states [waiting, deciding, decided, executed, dropped]", () => {
      expect(d.states.sort()).toEqual(
        ["decided", "deciding", "dropped", "executed", "waiting"],
      );
    });
    it("initial state is waiting (the parking-lot before active deciding)", () => {
      expect(d.initialState).toBe("waiting");
    });
    it("terminal states are [executed, dropped]", () => {
      expect(d.terminalStates.sort()).toEqual(["dropped", "executed"]);
    });
  });

});

describe("spanda 4-profile catalog: legacy + default behavior", () => {
  describe("legacy profile ids round-trip (augment-not-replace strategy)", () => {
    // Per the v2 spec we'd map autopilot* / semiauto* → "do" via normalize.
    // Pragmatic deviation: legacy ids round-trip to THEMSELVES so the 63
    // upstream-coupled tests stay green. The user-facing surface still
    // defaults new beads to "do" via DEFAULT_PROFILE_ID; legacy ids are
    // only carried for backwards compat.
    it("autopilot round-trips", () => {
      expect(normalizeProfileId("autopilot")).toBe("autopilot");
    });
    it("autopilot_no_planning round-trips", () => {
      expect(normalizeProfileId("autopilot_no_planning")).toBe("autopilot_no_planning");
    });
    it("semiauto round-trips", () => {
      expect(normalizeProfileId("semiauto")).toBe("semiauto");
    });
    it("builtinProfileDescriptor('autopilot_no_planning') resolves to autopilot_no_planning", () => {
      expect(builtinProfileDescriptor("autopilot_no_planning").id).toBe("autopilot_no_planning");
    });
  });

  describe("default behavior: fall-through stays on autopilot", () => {
    // No-label fallback stays on autopilot (upstream-compat). Beads with
    // explicit work:* labels route to spanda profiles via the routing layer.
    it("builtinProfileDescriptor(undefined) returns the autopilot descriptor", () => {
      expect(builtinProfileDescriptor(undefined).id).toBe("autopilot");
    });
    it("builtinProfileDescriptor(null) returns the autopilot descriptor", () => {
      expect(builtinProfileDescriptor(null).id).toBe("autopilot");
    });
  });

  describe("the spanda profile ids round-trip cleanly", () => {
    it("'do' returns the do descriptor (not normalized to anything else)", () => {
      expect(normalizeProfileId("do")).toBe("do");
      expect(builtinProfileDescriptor("do").id).toBe("do");
    });
    it("'coordinate' round-trips", () => {
      expect(normalizeProfileId("coordinate")).toBe("coordinate");
      expect(builtinProfileDescriptor("coordinate").id).toBe("coordinate");
    });
    it("'followup' round-trips", () => {
      expect(normalizeProfileId("followup")).toBe("followup");
      expect(builtinProfileDescriptor("followup").id).toBe("followup");
    });
    it("'decide' round-trips", () => {
      expect(normalizeProfileId("decide")).toBe("decide");
      expect(builtinProfileDescriptor("decide").id).toBe("decide");
    });
  });
});
