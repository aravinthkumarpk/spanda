// quick-capture-update — pure UPDATE-mode extension of quick-capture.ts.
//
// A2 keystone: the shared Add/Update form reuses the shipped create layer
// (src/lib/quick-capture.ts) and adds three pure helpers for editing an
// existing beat:
//
//   1. beatToQuickCaptureInput(beat, profile) — reverse-derive a
//      QuickCaptureInput from a stored beat for pre-fill. The caller resolves
//      the QuickCaptureProfile from beat.profileId via normalizeProfileId and
//      passes it in (a REQUIRED arg) so an unresolvable profile fails loud at
//      the call site, never silently here.
//   2. validateQuickCaptureUpdate(input) — identical rules to create
//      (delegates to validateQuickCapturePayload so there is one rule set).
//   3. diffQuickCaptureUpdate(original, edited, originalLabels) — a MINIMAL
//      PATCH payload: only changed scalar fields and label add/remove for the
//      work:/with:/chasing: namespaces this module owns. It never touches
//      project:/source:/other labels.
//
// Kept as a sibling module (not appended to quick-capture.ts) to leave the
// shipped create layer untouched and stay under the 500-line file cap.
//
// Hermetic — no DOM access, no React imports, no env.

import {
  validateQuickCapturePayload,
  type QuickCaptureInput,
  type QuickCaptureProfile,
  type ValidationResult,
} from "@/lib/quick-capture";
import type { UpdateBeatInput } from "@/lib/schemas";

/** Source shape for pre-fill: the stored beat's editable fields + labels. */
export type UpdatableBeat = {
  title: string;
  description?: string;
  labels: string[];
};

/** Label prefix that carries the assigned person for each person-bearing profile. */
const PERSON_PREFIX: Partial<Record<QuickCaptureProfile, string>> = {
  coordinate: "with:",
  followup: "chasing:",
};

/**
 * Reverse-derive a QuickCaptureInput from a stored beat for pre-fill.
 *
 * Title/description are copied verbatim (undefined description -> ""). The
 * person is extracted only for the profile that owns a person label
 * (coordinate -> with:, followup -> chasing:); do/decide always yield a null
 * person. Prefix matching is case-insensitive, the first match wins, and the
 * stored person value is preserved verbatim (no lowercasing on read).
 */
export function beatToQuickCaptureInput(
  beat: UpdatableBeat,
  profile: QuickCaptureProfile,
): QuickCaptureInput {
  return {
    title: beat.title,
    description: beat.description ?? "",
    profile,
    person: extractPerson(beat.labels, profile),
  };
}

function extractPerson(
  labels: string[],
  profile: QuickCaptureProfile,
): string | null {
  const prefix = PERSON_PREFIX[profile];
  if (!prefix) return null;
  const lowerPrefix = prefix.toLowerCase();
  for (const label of labels) {
    if (label.toLowerCase().startsWith(lowerPrefix)) {
      return label.slice(prefix.length);
    }
  }
  return null;
}

/**
 * Validate an edited beat. Identical to create: delegates to the shipped
 * validateQuickCapturePayload so the do/coordinate/followup/decide rules stay
 * in exactly one place.
 */
export function validateQuickCaptureUpdate(
  input: QuickCaptureInput,
): ValidationResult {
  return validateQuickCapturePayload(input);
}

/**
 * Produce a MINIMAL UpdateBeatInput patch from the original vs edited input.
 *
 * Only emits keys that actually changed:
 *   - title/description: trimmed, included only when the trimmed value differs.
 *   - labels (additions) / removeLabels: computed over the work:/with:/chasing:
 *     namespaces this module owns. Owned labels in `originalLabels` that no
 *     longer match the desired set are removed (preserving their stored
 *     casing); desired labels not already present are added. project:/source:/
 *     any other namespace are never touched.
 *
 * An unchanged input yields {} (no keys at all).
 */
export function diffQuickCaptureUpdate(
  original: QuickCaptureInput,
  edited: QuickCaptureInput,
  originalLabels: string[],
): UpdateBeatInput {
  const patch: UpdateBeatInput = {};

  const title = edited.title.trim();
  if (title !== original.title.trim()) patch.title = title;

  const description = edited.description.trim();
  if (description !== original.description.trim()) patch.description = description;

  const desired = ownedLabelsFor(edited);
  const ownedOriginal = originalLabels.filter(isOwnedLabel);
  const desiredLower = new Set(desired.map((l) => l.toLowerCase()));
  const ownedLower = new Set(ownedOriginal.map((l) => l.toLowerCase()));

  const removeLabels = ownedOriginal.filter(
    (label) => !desiredLower.has(label.toLowerCase()),
  );
  const labels = desired.filter((label) => !ownedLower.has(label.toLowerCase()));

  if (labels.length > 0) patch.labels = labels;
  if (removeLabels.length > 0) patch.removeLabels = removeLabels;

  return patch;
}

/** The work:/with:/chasing: labels an edited input should carry. */
function ownedLabelsFor(input: QuickCaptureInput): string[] {
  const labels = [`work:${input.profile}`];
  const prefix = PERSON_PREFIX[input.profile];
  if (prefix && input.person) {
    labels.push(`${prefix}${input.person.trim().toLowerCase()}`);
  }
  return labels;
}

const OWNED_PREFIXES = ["work:", "with:", "chasing:"];

function isOwnedLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return OWNED_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
