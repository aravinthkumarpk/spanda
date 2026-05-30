/**
 * quick-capture — pure helpers for the quick-capture modal:
 *
 *   - validateQuickCapturePayload(): same acceptance-criteria rule as
 *     the bd-lint wrapper (title required + Acceptance/Done-when line
 *     in description for `work:do`; with:<person> for `work:coordinate`;
 *     chasing:<person> for `work:followup`).
 *   - shouldOpenOnKey(): predicate for the global '/' shortcut. Returns
 *     true only when the target isn't a typing context (input, textarea,
 *     contenteditable, select).
 *   - normalizeQuickCapturePayload(): trims fields, lowercases work labels,
 *     produces the POST body for /api/beats.
 *
 * Hermetic.
 */

import { describe, expect, it } from "vitest";
import {
  normalizeQuickCapturePayload,
  shouldOpenOnKey,
  validateQuickCapturePayload,
  type QuickCaptureInput,
} from "@/lib/quick-capture";

function input(overrides: Partial<QuickCaptureInput> = {}): QuickCaptureInput {
  return {
    title: "Sample bead",
    description: "writes hello to /tmp/x",
    profile: "do",
    acceptance: "file /tmp/x exists with 'hello'",
    person: null,
    ...overrides,
  };
}

describe("validateQuickCapturePayload: title", () => {
  it("rejects empty title", () => {
    const result = validateQuickCapturePayload(input({ title: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("title is required");
  });

  it("rejects whitespace-only title", () => {
    const result = validateQuickCapturePayload(input({ title: "   " }));
    expect(result.ok).toBe(false);
  });

  it("accepts a non-empty trimmed title", () => {
    const result = validateQuickCapturePayload(input({ title: "Fix it" }));
    expect(result.ok).toBe(true);
  });
});

describe("validateQuickCapturePayload: acceptance criteria for `do`", () => {
  it("requires a non-empty acceptance field for `do`", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "do", acceptance: "" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/acceptance/i);
    }
  });

  it("rejects whitespace-only acceptance for `do`", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "do", acceptance: "   " }),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts `do` with a non-empty acceptance field", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "do", acceptance: "the file exists" }),
    );
    expect(result.ok).toBe(true);
  });

  it("does not read acceptance from the description (native field only)", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "do", description: "Acceptance: in description", acceptance: "" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("validateQuickCapturePayload: people-tag enforcement", () => {
  it("rejects coordinate without a person", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "coordinate", person: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/with:/);
  });

  it("accepts coordinate WITH a person", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "coordinate", person: "khilan" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects followup without a person", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "followup", person: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/chasing:/);
  });

  it("accepts followup WITH a person", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "followup", person: "pratul" }),
    );
    expect(result.ok).toBe(true);
  });

  it("decide does NOT require a person", () => {
    const result = validateQuickCapturePayload(
      input({ profile: "decide", description: "", person: null }),
    );
    expect(result.ok).toBe(true);
  });

  it("coord / followup don't need an Acceptance line (different workflow)", () => {
    expect(
      validateQuickCapturePayload(
        input({ profile: "coordinate", description: "", person: "khilan" }),
      ).ok,
    ).toBe(true);
    expect(
      validateQuickCapturePayload(
        input({ profile: "followup", description: "", person: "pratul" }),
      ).ok,
    ).toBe(true);
  });
});

describe("normalizeQuickCapturePayload: shape for POST /api/beats", () => {
  it("trims title + description", () => {
    const result = normalizeQuickCapturePayload(
      input({ title: "  Foo  ", description: "  Acceptance: x  " }),
    );
    expect(result.title).toBe("Foo");
    expect(result.description).toBe("Acceptance: x");
  });

  it("trims the acceptance field into the payload", () => {
    const result = normalizeQuickCapturePayload(
      input({ acceptance: "  done when green  " }),
    );
    expect(result.acceptance).toBe("done when green");
  });

  it("adds work:<profile> label", () => {
    const result = normalizeQuickCapturePayload(input({ profile: "do" }));
    expect(result.labels).toContain("work:do");
  });

  it("adds with:<person> for coordinate", () => {
    const result = normalizeQuickCapturePayload(
      input({ profile: "coordinate", person: "khilan" }),
    );
    expect(result.labels).toContain("with:khilan");
  });

  it("adds chasing:<person> for followup", () => {
    const result = normalizeQuickCapturePayload(
      input({ profile: "followup", person: "pratul" }),
    );
    expect(result.labels).toContain("chasing:pratul");
  });

  it("lowercases the person tag", () => {
    const result = normalizeQuickCapturePayload(
      input({ profile: "coordinate", person: "Khilan" }),
    );
    expect(result.labels).toContain("with:khilan");
  });

  it("does NOT add with:/chasing: for do or decide", () => {
    const result = normalizeQuickCapturePayload(
      input({ profile: "do", person: "khilan" }),
    );
    expect(result.labels.some((l) => l.startsWith("with:") || l.startsWith("chasing:"))).toBe(false);
  });
});

describe("shouldOpenOnKey: shortcut predicate", () => {
  it("returns true for body / div target", () => {
    expect(shouldOpenOnKey({ tagName: "BODY", isContentEditable: false })).toBe(true);
    expect(shouldOpenOnKey({ tagName: "DIV", isContentEditable: false })).toBe(true);
  });

  it("returns false for INPUT target", () => {
    expect(shouldOpenOnKey({ tagName: "INPUT", isContentEditable: false })).toBe(false);
  });

  it("returns false for TEXTAREA target", () => {
    expect(shouldOpenOnKey({ tagName: "TEXTAREA", isContentEditable: false })).toBe(false);
  });

  it("returns false for SELECT target", () => {
    expect(shouldOpenOnKey({ tagName: "SELECT", isContentEditable: false })).toBe(false);
  });

  it("returns false for contenteditable target regardless of tagName", () => {
    expect(shouldOpenOnKey({ tagName: "DIV", isContentEditable: true })).toBe(false);
  });

  it("returns false when target is null (defensive)", () => {
    expect(shouldOpenOnKey(null)).toBe(false);
  });
});
