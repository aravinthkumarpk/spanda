// quick-capture — pure helpers for the quick-capture modal in
// the spanda UI.
//
// Two responsibilities:
//   1. Validate a freshly-typed bead before POSTing to /api/beats —
//      same rules as the bd-lint wrapper:
//        - title required
//        - `do` profile beads need an "Acceptance:" / "Done when:" /
//          "Done-when:" line in the description
//        - `coordinate` beads require a person (becomes with:<person>)
//        - `followup` beads require a person (becomes chasing:<person>)
//        - `decide` beads have no person/acceptance requirement
//   2. Normalize the form input into the API payload shape (trimmed
//      strings, lowercased person tags, labels assembled).
//
// Plus a tiny shouldOpenOnKey() predicate for the global '/' shortcut:
// returns true when the user is NOT in a typing context (input, textarea,
// select, contenteditable).
//
// Hermetic — no DOM access, no React imports.

export type QuickCaptureProfile = "do" | "coordinate" | "followup" | "decide";

export interface QuickCaptureInput {
  title: string;
  description: string;
  profile: QuickCaptureProfile;
  /**
   * Acceptance criteria. Stored in the bead's NATIVE `acceptance_criteria`
   * field (not embedded in the description). Required non-empty for `do`.
   */
  acceptance: string;
  /** Person tag value for coordinate (with:) or followup (chasing:); null otherwise. */
  person: string | null;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Validate a quick-capture payload. Returns ok=true if all rules pass,
 * or { ok: false, errors: [...] } with a list of human-readable rejections.
 */
export function validateQuickCapturePayload(payload: QuickCaptureInput): ValidationResult {
  const errors: string[] = [];

  if (!payload.title || payload.title.trim().length === 0) {
    errors.push("title is required");
  }

  // The `do` profile (agent-eligible IC work) MUST declare acceptance —
  // captured in the native acceptance_criteria field.
  if (payload.profile === "do") {
    if (!payload.acceptance || payload.acceptance.trim().length === 0) {
      errors.push(
        "acceptance criteria required for `do` beads (fill the Acceptance field)",
      );
    }
  }

  if (payload.profile === "coordinate") {
    if (!payload.person || payload.person.trim().length === 0) {
      errors.push("coordinate beads require a `with:<person>` tag");
    }
  }

  if (payload.profile === "followup") {
    if (!payload.person || payload.person.trim().length === 0) {
      errors.push("followup beads require a `chasing:<person>` tag");
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export interface QuickCapturePayload {
  title: string;
  description: string;
  acceptance: string;
  labels: string[];
}

/**
 * Normalize input into the POST /api/beats payload. Trims fields,
 * lowercases person tags, assembles labels.
 */
export function normalizeQuickCapturePayload(
  input: QuickCaptureInput,
): QuickCapturePayload {
  const labels: string[] = [`work:${input.profile}`];
  if (input.profile === "coordinate" && input.person) {
    labels.push(`with:${input.person.trim().toLowerCase()}`);
  } else if (input.profile === "followup" && input.person) {
    labels.push(`chasing:${input.person.trim().toLowerCase()}`);
  }
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    acceptance: input.acceptance.trim(),
    labels,
  };
}

export interface KeyTarget {
  tagName: string;
  isContentEditable: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Decide whether the global '/' shortcut should fire. Returns false
 * when the user is actively typing into a form control or a
 * contenteditable surface.
 */
export function shouldOpenOnKey(target: KeyTarget | null): boolean {
  if (target === null) return false;
  if (target.isContentEditable) return false;
  if (TYPING_TAGS.has(target.tagName.toUpperCase())) return false;
  return true;
}
