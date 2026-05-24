// label-filter — pure helpers for the spanda label-checkbox-group
// filter in filter-bar.tsx.
//
// Per phase2.html locked decision:
//   - Multi-label selection uses OR semantics (a beat with ANY selected
//     label is included)
//   - Labels in the UI are grouped by namespace prefix (work:* first,
//     then with:*, chasing:*, others)
//   - URL state shape: ?labels=work:do,with:khilan,chasing:pratul

export interface LabelGroup {
  /** Namespace prefix without the colon (e.g. "work", "with", "chasing", or "other"). */
  label: string;
  /** Labels in this group, alphabetised. */
  labels: string[];
}

/** Anything with a labels: string[] field is filterable. */
interface LabelledBeat {
  labels: string[];
}

/**
 * Filter beats by selected labels using OR semantics.
 * Empty selection returns the full set unchanged.
 */
export function filterBeatsByLabels<T extends LabelledBeat>(
  beats: T[],
  selectedLabels: string[],
): T[] {
  if (selectedLabels.length === 0) return beats;
  const selected = new Set(selectedLabels);
  return beats.filter((beat) =>
    beat.labels.some((label) => selected.has(label)),
  );
}

/** Collect the unique set of labels across a beat collection. */
export function collectLabels<T extends LabelledBeat>(beats: T[]): string[] {
  const seen = new Set<string>();
  for (const beat of beats) {
    for (const label of beat.labels) seen.add(label);
  }
  return Array.from(seen);
}

/** Namespace ordering used by the checkbox group UI. */
const NAMESPACE_ORDER = ["work", "with", "chasing"];

/**
 * Group labels by their namespace (the prefix before the first colon).
 * Returns groups in the canonical order: work, with, chasing, then
 * everything else alphabetically.
 */
export function groupLabels(labels: string[]): LabelGroup[] {
  const buckets = new Map<string, string[]>();
  for (const label of labels) {
    const colon = label.indexOf(":");
    const ns = colon === -1 ? "other" : label.slice(0, colon);
    if (!buckets.has(ns)) buckets.set(ns, []);
    buckets.get(ns)!.push(label);
  }
  // Sort labels within each bucket.
  for (const [, list] of buckets) list.sort();
  // Order groups: NAMESPACE_ORDER first, then any remaining sorted alphabetically.
  const knownGroups = NAMESPACE_ORDER
    .filter((ns) => buckets.has(ns))
    .map((ns) => ({ label: ns, labels: buckets.get(ns)! }));
  const otherKeys = Array.from(buckets.keys())
    .filter((ns) => !NAMESPACE_ORDER.includes(ns))
    .sort();
  const otherGroups = otherKeys.map((ns) => ({ label: ns, labels: buckets.get(ns)! }));
  return [...knownGroups, ...otherGroups];
}

/** Serialize a label selection to a URL query-param value. Null when empty. */
export function serializeLabelsParam(selected: string[]): string | null {
  if (selected.length === 0) return null;
  return selected.join(",");
}

/** Parse the URL query-param value back into a selection. */
export function parseLabelsParam(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
