/**
 * stale — canonical pure version of the shipped StaleBadge rule.
 *
 * Extracted verbatim from `src/components/stale-badge.tsx` so the same
 * "has this beat stopped moving?" question has one deterministic answer
 * for both the badge renderer and portfolio-health logic.
 *
 * Rule (ported exactly from the shipped component):
 *   - Threshold defaults to 7 days.
 *   - STRICT greater-than: an age of exactly N days is NOT stale; only an
 *     age that EXCEEDS N days is stale. This avoids re-flagging a beat from
 *     "last Monday" every Monday morning.
 *   - Fail-soft: null / undefined / unparseable timestamps are treated as
 *     not stale (the badge renders nothing). Data fail-soft only — there is
 *     no config to misresolve here.
 *
 * Hermetic: `now` is injected as a number; this module never reads the
 * wall clock.
 */

const DAY_MS = 86_400_000;
const DEFAULT_THRESHOLD_DAYS = 7;

/**
 * Whether `updated` is older than `thresholdDays` relative to `now`.
 *
 * STRICT greater-than: exactly `thresholdDays` days old = not stale.
 * Fail-soft: missing or malformed `updated` -> false.
 */
export function isStale(
  updated: string | null | undefined,
  now: number,
  thresholdDays: number = DEFAULT_THRESHOLD_DAYS,
): boolean {
  if (!updated) return false;
  const updatedMs = Date.parse(updated);
  if (Number.isNaN(updatedMs)) return false;
  const ageMs = now - updatedMs;
  return ageMs > thresholdDays * DAY_MS;
}

/**
 * Whole-day age of `updated` relative to `now`, floored.
 *
 * Returns null for missing or malformed timestamps (fail-soft), matching
 * the badge's "render nothing" behaviour.
 */
export function staleAgeDays(
  updated: string | null | undefined,
  now: number,
): number | null {
  if (!updated) return null;
  const updatedMs = Date.parse(updated);
  if (Number.isNaN(updatedMs)) return null;
  return Math.floor((now - updatedMs) / DAY_MS);
}
