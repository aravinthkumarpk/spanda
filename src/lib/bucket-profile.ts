/**
 * bucket-profile — pure, catalog-derived, fail-loud bidirectional mapping
 * between a `work:*` bucket label and the spanda profile id used at create
 * time.
 *
 * Replaces the implicit `work:${profile}` string-building (see
 * quick-capture.normalizeQuickCapturePayload) with one place that knows the
 * mapping in BOTH directions and FAILS LOUD on anything outside the spanda
 * buckets.
 *
 * Buckets are exactly the 4 spanda profiles — do / coordinate / followup /
 * decide — surfaced as `work:do` … `work:decide`. The upstream Foolery
 * profiles (autopilot, semiauto, …) are NOT buckets and never get a
 * `work:*` label.
 *
 * Catalog-derived (CLAUDE.md exception 1):
 *   - The id set is the QuickCaptureProfile union (the 4 ids), held as a
 *     literal tuple so surface order is explicit.
 *   - The display form for each bucket comes from the builtin profile
 *     descriptor `label` (its displayName) — not a fresh hardcoded table.
 *
 * Case policy (LOCKED): input is trimmed and lowercased before matching.
 * `work:Do`, `WORK:DO`, `  work:do  ` all normalize to `do`. We normalize
 * rather than throw because stored labels and hand-typed input drift in
 * case, and a silent reject there would be a worse failure mode than a
 * forgiving match against the closed, known-good set.
 *
 * Hermetic — no DOM, no fs, no clock, no env.
 */
import type { QuickCaptureProfile } from "@/lib/quick-capture";
import { builtinWorkflowDescriptors } from "@/lib/workflows";

/** Canonical namespace prefix for bucket labels. */
export const BUCKET_LABEL_PREFIX = "work:";

/**
 * The 4 spanda bucket profile ids in surface order. Held as a literal tuple
 * (the QuickCaptureProfile union) so the order shown in the settings/filter
 * UI is explicit and stable.
 */
const SPANDA_BUCKET_PROFILE_IDS: ReadonlyArray<QuickCaptureProfile> = [
  "do",
  "coordinate",
  "followup",
  "decide",
];

const BUCKET_PROFILE_ID_SET: ReadonlySet<string> = new Set(
  SPANDA_BUCKET_PROFILE_IDS,
);

/** Returns the 4 spanda bucket profile ids in surface order (fresh array). */
export function spandaBucketProfileIds(): string[] {
  return [...SPANDA_BUCKET_PROFILE_IDS];
}

/**
 * Display form per bucket id, derived from the builtin profile catalog
 * (`descriptor.label` === the profile displayName for unprefixed builtins).
 * Built once at module load from the catalog so it can never drift from the
 * profile definitions.
 */
const BUCKET_DISPLAY_BY_ID: ReadonlyMap<string, string> = (() => {
  const byId = new Map(
    builtinWorkflowDescriptors().map((d) => [d.profileId, d.label]),
  );
  const display = new Map<string, string>();
  for (const id of SPANDA_BUCKET_PROFILE_IDS) {
    const label = byId.get(id);
    if (!label) {
      throw new Error(
        `FOOLERY BUCKET CATALOG: spanda bucket profile "${id}" is missing ` +
          "from the builtin profile catalog (builtinWorkflowDescriptors); " +
          `expected one of every id in [${SPANDA_BUCKET_PROFILE_IDS.join(", ")}]`,
      );
    }
    display.set(id, label);
  }
  return display;
})();

function validBucketSet(): string {
  return SPANDA_BUCKET_PROFILE_IDS.map((id) => `${BUCKET_LABEL_PREFIX}${id}`).join(
    ", ",
  );
}

/** Normalize raw input: trim + lowercase, strip a single `work:` prefix. */
function toProfileId(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  const id = normalized.startsWith(BUCKET_LABEL_PREFIX)
    ? normalized.slice(BUCKET_LABEL_PREFIX.length)
    : normalized;
  if (!id) return null;
  return BUCKET_PROFILE_ID_SET.has(id) ? id : null;
}

/**
 * Resolve a bucket label (`work:do`) or bare id (`do`) to the spanda profile
 * id. UNKNOWN bucket, empty string, or a non-bucket namespace THROWS a
 * FOOLERY-style error naming the bad value and the valid set. Never returns a
 * silent default.
 */
export function profileForBucket(bucketLabel: string): string {
  const id = toProfileId(bucketLabel);
  if (id) return id;
  throw new Error(
    `FOOLERY BUCKET PROFILE: unknown bucket "${bucketLabel}" — not one of ` +
      `the spanda buckets [${validBucketSet()}] (bare ids ` +
      `[${SPANDA_BUCKET_PROFILE_IDS.join(", ")}] also accepted)`,
  );
}

/**
 * Resolve a spanda profile id to its `work:*` bucket label. An id outside the
 * spanda 4 (e.g. "autopilot") THROWS — it never gets a `work:autopilot`
 * label. Round-trips with profileForBucket for the 4.
 */
export function bucketForProfile(profileId: string): string {
  const normalized = profileId.trim().toLowerCase();
  if (normalized && BUCKET_PROFILE_ID_SET.has(normalized)) {
    return `${BUCKET_LABEL_PREFIX}${normalized}`;
  }
  throw new Error(
    `FOOLERY BUCKET PROFILE: profile "${profileId}" is not a spanda bucket ` +
      `profile — valid ids are [${SPANDA_BUCKET_PROFILE_IDS.join(", ")}]`,
  );
}

/**
 * The 4 `work:*` bucket labels in surface order, excluding upstream
 * profiles. Fresh array each call.
 */
export function listBuckets(): string[] {
  return SPANDA_BUCKET_PROFILE_IDS.map((id) => `${BUCKET_LABEL_PREFIX}${id}`);
}

/**
 * Pick the single bucket display label from a label set for a card badge.
 * Returns the display form (e.g. "Do", "Follow-up") for the bucket, or null
 * when there is no recognized `work:*` bucket label. When more than one
 * bucket label is present (a data bug), picks deterministically by surface
 * order — independent of input order.
 */
export function bucketCardLabel(labels: string[]): string | null {
  const present = new Set<string>();
  for (const label of labels) {
    const normalized = label.trim().toLowerCase();
    // Only real `work:*` labels count as bucket labels on a card.
    if (!normalized.startsWith(BUCKET_LABEL_PREFIX)) continue;
    const id = normalized.slice(BUCKET_LABEL_PREFIX.length);
    if (id && BUCKET_PROFILE_ID_SET.has(id)) present.add(id);
  }
  for (const id of SPANDA_BUCKET_PROFILE_IDS) {
    if (present.has(id)) return BUCKET_DISPLAY_BY_ID.get(id) ?? null;
  }
  return null;
}
