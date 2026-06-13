// Feature gate (MVP lean cut). OPTIONAL chrome that can be turned off per
// deploy via SPANDA_FEATURES (comma list of ENABLED optional features).
//   - unset  → all optional features on  (upstream-safe; additive to the fork)
//   - ""     → all optional features off (explicit minimal)
//   - "a,b"  → exactly those on; an unknown name throws (no silent no-op)
//
// Core surfaces (board/projects/today/artifacts, beat detail, the per-beat
// Run action) are NOT gated here — they're always on. This gate only governs
// the chrome the user never asked for.

export type OptionalFeature =
  | "create"        // the "new task" button
  | "terminal"      // the manual terminal toggle (Run still hosts its own session)
  | "approvals"     // the agent-escalation banner
  | "settings"      // the settings sheet (agents/pools/dispatch config)
  | "repoSwitcher"  // multi-repo switcher
  | "registry"      // the /registry route
  | "search";       // the search bar

export const OPTIONAL_FEATURES: readonly OptionalFeature[] = [
  "create", "terminal", "approvals", "settings",
  "repoSwitcher", "registry", "search",
];

export class UnknownFeatureError extends Error {
  constructor(name: string) {
    super(
      `SPANDA FEATURES FAILURE: unknown feature "${name}" in SPANDA_FEATURES. `
      + `Valid: ${OPTIONAL_FEATURES.join(", ")}`,
    );
    this.name = "UnknownFeatureError";
  }
}

export function resolveFeatures(
  config: string | null | undefined,
): Set<OptionalFeature> {
  if (config === undefined || config === null) {
    return new Set(OPTIONAL_FEATURES);
  }
  const out = new Set<OptionalFeature>();
  for (const raw of config.split(",")) {
    const name = raw.trim();
    if (name === "") continue;
    if (!(OPTIONAL_FEATURES as readonly string[]).includes(name)) {
      throw new UnknownFeatureError(name);
    }
    out.add(name as OptionalFeature);
  }
  return out;
}

export function featureEnabled(
  name: OptionalFeature,
  features: ReadonlySet<OptionalFeature>,
): boolean {
  return features.has(name);
}
