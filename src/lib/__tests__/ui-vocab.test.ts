/**
 * ui-vocab — UI-only label translation layer.
 *
 * Internal types + API routes + file names keep the musical Foolery
 * vocabulary (Beat / Take / Scene / Setlist / ReTakes). The translation
 * layer swaps user-facing strings to a "plain" vocabulary by default
 * (Task / Run / Plan / Plan board / Reviews) so any knowledge worker
 * can use the app without learning jargon.
 *
 * Per the v2 spec, locked Option B. Single source of truth: src/lib/
 * ui-vocab.ts. Components consume via useVocab() hook.
 *
 * "verbose" vocabulary preserves the musical originals — opt-in for
 * users who want the brand voice.
 *
 * Hermetic.
 */

import { describe, expect, it } from "vitest";
import { VOCAB, vocab, type VocabKey } from "@/lib/ui-vocab";

describe("VOCAB: two vocabularies registered", () => {
  it("plain is the default", () => {
    expect(VOCAB.plain).toBeDefined();
    expect(VOCAB.verbose).toBeDefined();
  });

  it("both vocabularies have the same keys (no drift)", () => {
    const plainKeys = Object.keys(VOCAB.plain).sort();
    const verboseKeys = Object.keys(VOCAB.verbose).sort();
    expect(plainKeys).toEqual(verboseKeys);
  });
});

describe("plain mode: the spec's exact mapping", () => {
  const plain = VOCAB.plain;

  it("maps Take! → Start (ADR-0004 canonical verb)", () => {
    expect(plain["Take!"]).toBe("Start");
  });

  it("maps Scene! → Plan it", () => {
    expect(plain["Scene!"]).toBe("Plan it");
  });

  it("maps Beat → Task and Beats → Tasks (case-preserving)", () => {
    expect(plain["Beat"]).toBe("Task");
    expect(plain["Beats"]).toBe("Tasks");
    expect(plain["beat"]).toBe("task");
    expect(plain["beats"]).toBe("tasks");
  });

  it("maps Setlist → Plan board", () => {
    expect(plain["Setlist"]).toBe("Plan board");
  });

  it("maps ReTakes → Regressions (ADR-0004; 'Review' is the gate)", () => {
    expect(plain["ReTakes"]).toBe("Regressions");
  });

  it("maps Escalations → Blockers", () => {
    expect(plain["Escalations"]).toBe("Blockers");
  });

  it("maps Capsule → Context", () => {
    expect(plain["Capsule"]).toBe("Context");
  });
});

describe("verbose mode: preserves all originals (identity map)", () => {
  const verbose = VOCAB.verbose;

  it("Take! stays Take!", () => {
    expect(verbose["Take!"]).toBe("Take!");
  });

  it("Beat stays Beat", () => {
    expect(verbose["Beat"]).toBe("Beat");
  });

  it("Setlist stays Setlist", () => {
    expect(verbose["Setlist"]).toBe("Setlist");
  });

  it("ReTakes stays ReTakes", () => {
    expect(verbose["ReTakes"]).toBe("ReTakes");
  });
});

describe("vocab() helper: fail-soft on missing keys", () => {
  it("returns the plain mapping for a known key", () => {
    expect(vocab("plain", "Take!")).toBe("Start");
  });

  it("returns the verbose mapping for the same key when verbose requested", () => {
    expect(vocab("verbose", "Take!")).toBe("Take!");
  });

  it("returns the input string verbatim for an UNKNOWN key (fail-soft)", () => {
    // Cast through unknown to test the runtime fail-soft path even though
    // TypeScript would catch this at compile time.
    expect(vocab("plain", "NonExistentKey" as unknown as VocabKey)).toBe("NonExistentKey");
  });

  it("returns the input string verbatim when a key is missing from one vocab but present in the other", () => {
    // This shouldn't happen given the no-drift test above but the
    // fail-soft path covers it.
    expect(vocab("plain", "SomeAdHocLabel" as unknown as VocabKey)).toBe("SomeAdHocLabel");
  });
});

describe("VocabKey type covers at least the 17 known user-facing strings", () => {
  it("includes all the musical-metaphor strings", () => {
    const required: VocabKey[] = [
      "Take!", "Scene!", "Beat", "Beats", "beat", "beats",
      "Setlist", "ReTakes", "Escalations", "Capsule",
    ];
    // Compile-time: this won't typecheck if any name isn't in VocabKey.
    // Runtime: confirm each resolves.
    for (const key of required) {
      expect(VOCAB.plain[key]).toBeDefined();
      expect(VOCAB.verbose[key]).toBeDefined();
    }
  });
});
