// today-promote — pure layer for promoting a /today daily line into a
// Board task (Q6).
//
// The /today launchpad lets you turn a free-text daily line into a real
// Board task. Per spec this is "minimal defaults, edit-before-write":
// pre-fill a quick-capture form, let the user edit, confirm. Nothing is
// created silently — the `do` profile requires an acceptance line, so the
// empty acceptance stub forces the user to fill it before the POST passes
// validateQuickCapturePayload.
//
// Dedup: the created task carries `source:today-YYYY-MM-DD`; /today reads
// that label back and shows a "→ promoted" marker so the same line isn't
// double-created across mornings.
//
// Hermetic — all dates are passed in (no wall clock), no fs, no network.

import {
  normalizeQuickCapturePayload,
  type QuickCaptureInput,
  type QuickCaptureProfile,
} from "@/lib/quick-capture";
import { profileForBucket } from "@/lib/bucket-profile";

/**
 * UTC YYYY-MM-DD formatter — mirrors `formatYMD` in src/lib/daily-loader.ts
 * (UTC components, zero-padded month/day).
 */
function formatYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Source-label prefix for /today-promoted tasks. */
const TODAY_SOURCE_PREFIX = "source:today-";

/** Strict YYYY-MM-DD shape (zero-padded). */
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build the dedup label for a promoted line:
 * `source:today-YYYY-MM-DD` using UTC components.
 */
export function buildTodaySourceLabel(date: Date): string {
  return `${TODAY_SOURCE_PREFIX}${formatYMD(date)}`;
}

/**
 * Parse a `source:today-YYYY-MM-DD` label back to its `YYYY-MM-DD` date,
 * or null if the label is not a well-formed today-source label. Rejects
 * unrelated labels (`work:do`), malformed payloads (`source:today-garbage`),
 * non-padded dates (`source:today-2026-5-3`), and the empty string.
 */
export function parseTodaySourceLabel(label: string): string | null {
  if (!label.startsWith(TODAY_SOURCE_PREFIX)) return null;
  const ymd = label.slice(TODAY_SOURCE_PREFIX.length);
  return YMD_RE.test(ymd) ? ymd : null;
}

/**
 * Pre-filled defaults for the promote form. Intentionally NOT a complete
 * /api/beats payload — `acceptance` is an empty stub so do-validation forces
 * the user to fill it, and `profileId` is left undefined so the POST handler's
 * resolveDefaultProfile picks the live `do` descriptor (no hardcoded id).
 */
export interface PromoteDefaults {
  /** Title = the trimmed daily line. */
  title: string;
  /** Empty stub — do-validation requires the user to fill acceptance. */
  acceptance: "";
  /** ['work:do', 'source:today-YYYY-MM-DD']. */
  labels: string[];
  /** Unsorted — no project parent. */
  parent: undefined;
  /** Canonical work repo, threaded so it lands there (not spanda's .knots). */
  repo: string;
  /** Undefined — server resolveDefaultProfile picks the live `do` descriptor. */
  profileId: undefined;
}

export interface LineToPromoteOptions {
  /** Date of the daily the line came from (for the dedup source label). */
  date: Date;
  /** The registered work repo path the task should be created in. */
  canonicalRepo: string;
}

/**
 * Turn a daily line into the pre-filled promote-form defaults.
 * title = trimmed line; acceptance = '' (stub); labels = work:do + source
 * label; parent/profileId undefined; repo = the canonical work repo.
 */
export function lineToPromoteDefaults(
  line: string,
  opts: LineToPromoteOptions,
): PromoteDefaults {
  return {
    title: line.trim(),
    acceptance: "",
    labels: ["work:do", buildTodaySourceLabel(opts.date)],
    parent: undefined,
    repo: opts.canonicalRepo,
    profileId: undefined,
  };
}

/**
 * Collect the trimmed titles of tasks that carry any `source:today-*` label.
 * Used by /today to mark already-promoted lines.
 */
export function collectPromotedLines(
  tasks: Array<{ title: string; labels: string[] }>,
): Set<string> {
  const promoted = new Set<string>();
  for (const task of tasks) {
    const hasTodaySource = task.labels.some(
      (label) => parseTodaySourceLabel(label) !== null,
    );
    if (hasTodaySource) promoted.add(task.title.trim());
  }
  return promoted;
}

/**
 * Whether a daily line has already been promoted: trimmed, case-sensitive
 * exact match against the promoted-title set. An empty line is never
 * considered promoted.
 */
export function isLinePromoted(line: string, promotedTitles: Set<string>): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  return promotedTitles.has(trimmed);
}

// ── Rich data-promotable marker layer (Q7/Q8) ───────────────────────────────
//
// The daily pipeline emits structured markers on promotable lines (see
// docs/today-promote-contract.md). The island reads them; these pure helpers
// turn a marker into the exact create payload and handle key-based dedup.

/** Label prefix carrying the stable per-line dedup key. */
const TODAY_KEY_PREFIX = "today-key:";

/** Structured promote marker read from a line's data-promote-* attributes. */
export interface PromoteMarker {
  /** Stable, unique-within-a-daily id. Drives dedup. */
  key: string;
  /** Clean task title (data-promote-title). */
  title: string;
  /** Bucket: do/coordinate/followup/decide (bare or `work:` prefixed). */
  bucket: string;
  /** Optional project value, e.g. "agent-studio" (no `project:` prefix). */
  project?: string;
  /** Acceptance criteria (required for do). */
  acceptance?: string;
  /** Person for coordinate (with:) / followup (chasing:). */
  person?: string;
}

/** Build the dedup label `today-key:<key>` for a promoted line. */
export function buildTodayKeyLabel(key: string): string {
  return `${TODAY_KEY_PREFIX}${key.trim()}`;
}

/** Parse a `today-key:<key>` label back to its key, or null. */
export function parseTodayKeyLabel(label: string): string | null {
  if (!label.startsWith(TODAY_KEY_PREFIX)) return null;
  const key = label.slice(TODAY_KEY_PREFIX.length).trim();
  return key.length > 0 ? key : null;
}

/**
 * Reverse the marker into a QuickCaptureInput for validation + the form.
 * The bucket maps to a profile via the catalog-derived profileForBucket
 * (fail-loud on an unknown bucket). Person is only kept for coordinate/followup.
 */
export function markerToQuickCaptureInput(marker: PromoteMarker): QuickCaptureInput {
  const profile = profileForBucket(marker.bucket) as QuickCaptureProfile;
  const needsPerson = profile === "coordinate" || profile === "followup";
  return {
    title: marker.title,
    description: "",
    profile,
    acceptance: marker.acceptance ?? "",
    person: needsPerson ? marker.person ?? null : null,
  };
}

/** The complete create payload a promoted marker produces. */
export interface PromoteCreatePayload {
  title: string;
  description: string;
  acceptance: string;
  labels: string[];
}

/**
 * Assemble the full create payload for a marker: the work:/with:/chasing:
 * labels come from normalizeQuickCapturePayload; this adds the dedup labels
 * (source:today-<date>, today-key:<key>) and the optional project label.
 */
export function buildPromotePayload(
  marker: PromoteMarker,
  date: Date,
): PromoteCreatePayload {
  const base = normalizeQuickCapturePayload(markerToQuickCaptureInput(marker));
  const labels = [
    ...base.labels,
    buildTodaySourceLabel(date),
    buildTodayKeyLabel(marker.key),
  ];
  const project = marker.project?.trim();
  if (project && project.length > 0 && project !== "unsorted") {
    labels.push(`project:${project}`);
  }
  return {
    title: base.title,
    description: base.description,
    acceptance: base.acceptance,
    labels,
  };
}

/** Collect the set of `today-key:*` keys already present across tasks. */
export function collectPromotedKeys(
  tasks: Array<{ labels: string[] }>,
): Set<string> {
  const keys = new Set<string>();
  for (const task of tasks) {
    for (const label of task.labels) {
      const key = parseTodayKeyLabel(label);
      if (key) keys.add(key);
    }
  }
  return keys;
}

/** Whether a marker's key has already been promoted (exact, trimmed). */
export function isKeyPromoted(key: string, promotedKeys: Set<string>): boolean {
  const trimmed = key.trim();
  return trimmed.length > 0 && promotedKeys.has(trimmed);
}
