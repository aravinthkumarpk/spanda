/**
 * quick-capture-update — pure UPDATE-mode tests for editing an existing
 * beat through the quick-capture modal.
 *
 *   - beatToQuickCaptureInput(): reconstruct a QuickCaptureInput from a
 *     stored beat (title/description verbatim, person extracted from the
 *     with:/chasing: label owned by the resolved profile).
 *   - validateQuickCaptureUpdate(): same rules as create.
 *   - diffQuickCaptureUpdate(): MINIMAL patch — only changed scalar fields
 *     and label add/remove for the work:/with:/chasing: namespaces this
 *     module owns. Never touches project:/source:/other labels.
 *
 * Hermetic — mirrors quick-capture.test.ts style.
 */

import { describe, expect, it } from "vitest";
import {
  beatToQuickCaptureInput,
  diffQuickCaptureUpdate,
  validateQuickCaptureUpdate,
} from "@/lib/quick-capture-update";
import type { QuickCaptureInput } from "@/lib/quick-capture";

function input(overrides: Partial<QuickCaptureInput> = {}): QuickCaptureInput {
  return {
    title: "Sample bead",
    description: "Acceptance: writes hello to /tmp/x",
    profile: "do",
    person: null,
    ...overrides,
  };
}

function beat(
  overrides: Partial<{ title: string; description?: string; labels: string[] }> = {},
): { title: string; description?: string; labels: string[] } {
  return {
    title: "Stored title",
    description: "Stored description",
    labels: [],
    ...overrides,
  };
}

describe("beatToQuickCaptureInput: scalar fields", () => {
  it("copies title verbatim", () => {
    const result = beatToQuickCaptureInput(
      beat({ title: "  Keep me  " }),
      "do",
    );
    expect(result.title).toBe("  Keep me  ");
  });

  it("copies description verbatim", () => {
    const result = beatToQuickCaptureInput(
      beat({ description: "  Acceptance: x  " }),
      "do",
    );
    expect(result.description).toBe("  Acceptance: x  ");
  });

  it("maps undefined description to ''", () => {
    const result = beatToQuickCaptureInput(
      beat({ description: undefined }),
      "do",
    );
    expect(result.description).toBe("");
  });

  it("uses the resolved profile passed by the caller", () => {
    const result = beatToQuickCaptureInput(beat(), "decide");
    expect(result.profile).toBe("decide");
  });
});

describe("beatToQuickCaptureInput: person extraction", () => {
  it("extracts with:<person> for coordinate", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:khilan"] }),
      "coordinate",
    );
    expect(result.person).toBe("khilan");
  });

  it("extracts chasing:<person> for followup", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["chasing:pratul"] }),
      "followup",
    );
    expect(result.person).toBe("pratul");
  });

  it("preserves the stored value (does not lowercase)", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:Khilan"] }),
      "coordinate",
    );
    expect(result.person).toBe("Khilan");
  });

  it("matches the prefix case-insensitively", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["WITH:khilan"] }),
      "coordinate",
    );
    expect(result.person).toBe("khilan");
  });

  it("takes the first match when several with: labels exist", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:khilan", "with:pratul"] }),
      "coordinate",
    );
    expect(result.person).toBe("khilan");
  });

  it("ignores chasing: labels when profile is coordinate", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["chasing:pratul"] }),
      "coordinate",
    );
    expect(result.person).toBeNull();
  });

  it("ignores with: labels when profile is followup", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:khilan"] }),
      "followup",
    );
    expect(result.person).toBeNull();
  });

  it("returns null person for do even when a with: label is present", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:khilan"] }),
      "do",
    );
    expect(result.person).toBeNull();
  });

  it("returns null person for decide", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["with:khilan", "chasing:pratul"] }),
      "decide",
    );
    expect(result.person).toBeNull();
  });

  it("returns null when no person label is present", () => {
    const result = beatToQuickCaptureInput(
      beat({ labels: ["project:spanda"] }),
      "coordinate",
    );
    expect(result.person).toBeNull();
  });
});

describe("validateQuickCaptureUpdate: same rules as create", () => {
  it("rejects empty title", () => {
    const result = validateQuickCaptureUpdate(input({ title: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("title is required");
  });

  it("requires an acceptance line for do", () => {
    const result = validateQuickCaptureUpdate(
      input({ profile: "do", description: "no acceptance here" }),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts do with an acceptance line", () => {
    const result = validateQuickCaptureUpdate(
      input({ profile: "do", description: "Acceptance: done" }),
    );
    expect(result.ok).toBe(true);
  });

  it("requires a person for coordinate", () => {
    const result = validateQuickCaptureUpdate(
      input({ profile: "coordinate", person: null }),
    );
    expect(result.ok).toBe(false);
  });

  it("requires a person for followup", () => {
    const result = validateQuickCaptureUpdate(
      input({ profile: "followup", person: null }),
    );
    expect(result.ok).toBe(false);
  });

  it("leaves decide unrestricted", () => {
    const result = validateQuickCaptureUpdate(
      input({ profile: "decide", description: "", person: null }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("diffQuickCaptureUpdate: no change", () => {
  it("returns {} when nothing changed", () => {
    const original = input({ profile: "do", title: "T", description: "Acceptance: a" });
    const edited = input({ profile: "do", title: "T", description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({});
  });

  it("treats whitespace-only differences in title as no change", () => {
    const original = input({ title: "Hello", description: "Acceptance: a" });
    const edited = input({ title: "  Hello  ", description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({});
  });
});

describe("diffQuickCaptureUpdate: scalar fields", () => {
  it("emits trimmed title only when it changed", () => {
    const original = input({ title: "Old", description: "Acceptance: a" });
    const edited = input({ title: "  New  ", description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({ title: "New" });
  });

  it("emits trimmed description only when it changed", () => {
    const original = input({ title: "T", description: "Acceptance: a" });
    const edited = input({ title: "T", description: "  Acceptance: b  " });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({ description: "Acceptance: b" });
  });

  it("emits both title and description when both changed", () => {
    const original = input({ title: "T1", description: "Acceptance: a" });
    const edited = input({ title: "T2", description: "Acceptance: b" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({ title: "T2", description: "Acceptance: b" });
  });
});

describe("diffQuickCaptureUpdate: person swap", () => {
  it("swaps with:<old> for with:<new>", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "pratul", description: "" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:coordinate", "with:khilan"]);
    expect(patch).toEqual({
      labels: ["with:pratul"],
      removeLabels: ["with:khilan"],
    });
  });

  it("lowercases the new person tag", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "Pratul", description: "" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:coordinate", "with:khilan"]);
    expect(patch).toEqual({
      labels: ["with:pratul"],
      removeLabels: ["with:khilan"],
    });
  });

  it("emits nothing for an unchanged person", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "khilan", description: "" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:coordinate", "with:khilan"]);
    expect(patch).toEqual({});
  });

  it("removes stored label regardless of its case", () => {
    const original = input({ profile: "coordinate", person: "Khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "pratul", description: "" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:coordinate", "with:Khilan"]);
    expect(patch).toEqual({
      labels: ["with:pratul"],
      removeLabels: ["with:Khilan"],
    });
  });
});

describe("diffQuickCaptureUpdate: profile change", () => {
  it("do -> coordinate swaps the work label and adds with:<person>", () => {
    const original = input({ profile: "do", person: null, description: "Acceptance: a" });
    const edited = input({ profile: "coordinate", person: "khilan", description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({
      labels: ["work:coordinate", "with:khilan"],
      removeLabels: ["work:do"],
    });
  });

  it("coordinate -> do drops with:<person> and swaps the work label", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "Acceptance: a" });
    const edited = input({ profile: "do", person: null, description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["work:coordinate", "with:khilan"],
    );
    expect(patch).toEqual({
      labels: ["work:do"],
      removeLabels: ["work:coordinate", "with:khilan"],
    });
  });

  it("coordinate -> followup swaps with: for chasing:", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "followup", person: "khilan", description: "" });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["work:coordinate", "with:khilan"],
    );
    expect(patch).toEqual({
      labels: ["work:followup", "chasing:khilan"],
      removeLabels: ["work:coordinate", "with:khilan"],
    });
  });

  it("do -> decide swaps only the work label", () => {
    const original = input({ profile: "do", person: null, description: "Acceptance: a" });
    const edited = input({ profile: "decide", person: null, description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(original, edited, ["work:do"]);
    expect(patch).toEqual({
      labels: ["work:decide"],
      removeLabels: ["work:do"],
    });
  });
});

describe("diffQuickCaptureUpdate: namespace isolation", () => {
  it("never removes project:/source:/other labels", () => {
    const original = input({ profile: "do", person: null, description: "Acceptance: a" });
    const edited = input({ profile: "coordinate", person: "khilan", description: "Acceptance: a" });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["work:do", "project:spanda", "source:slack"],
    );
    expect(patch.removeLabels).toEqual(["work:do"]);
    expect(patch.labels).toEqual(["work:coordinate", "with:khilan"]);
  });

  it("does not re-add a work label the beat already has", () => {
    const original = input({ profile: "do", person: null, description: "Acceptance: a" });
    const edited = input({ profile: "do", person: null, description: "  Acceptance: b  " });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["work:do", "project:spanda"],
    );
    expect(patch).toEqual({ description: "Acceptance: b" });
  });

  it("does not re-add a with: label that already matches", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "khilan", title: "Renamed", description: "" });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["work:coordinate", "with:khilan"],
    );
    expect(patch).toEqual({ title: "Renamed" });
  });

  it("adds a missing work label even when the scalar fields are unchanged", () => {
    const original = input({ profile: "coordinate", person: "khilan", description: "" });
    const edited = input({ profile: "coordinate", person: "khilan", description: "" });
    const patch = diffQuickCaptureUpdate(
      original,
      edited,
      ["with:khilan"],
    );
    expect(patch).toEqual({ labels: ["work:coordinate"] });
  });
});
