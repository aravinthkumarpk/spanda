// Surface allowlist (MVP hyper-focus): a deploy can narrow which /beats
// views exist via the SPANDA_SURFACES env (comma-separated view names),
// read server-side in the layout and passed down as plain data. Pure
// functions only — the env read stays at the server edge.
import { parseBeatsView, type BeatsView } from "@/lib/beats-view";

/** Every /beats view, in canonical display order. */
export const ALL_SURFACES: readonly BeatsView[] = [
  "board",
  "projects",
  "artifacts",
  "review",
  "setlist",
  "overview",
  "queues",
  "active",
  "search",
  "finalcut",
  "retakes",
  "history",
  "diagnostics",
];

/** A SPANDA_SURFACES entry names a view that does not exist — fail loud. */
export class UnknownSurfaceError extends Error {
  constructor(name: string) {
    super(
      `SPANDA SURFACES FAILURE: unknown view "${name}" in SPANDA_SURFACES. `
      + `Valid views: ${ALL_SURFACES.join(", ")}`,
    );
    this.name = "UnknownSurfaceError";
  }
}

export function resolveSurfaces(
  config: string | null | undefined,
): BeatsView[] {
  if (!config || config.trim() === "") return [...ALL_SURFACES];
  return config.split(",").map((s) => {
    const name = s.trim();
    if (!(ALL_SURFACES as readonly string[]).includes(name)) {
      throw new UnknownSurfaceError(name);
    }
    return name as BeatsView;
  });
}

/**
 * parseBeatsView, allowlist-aware: a URL pointing at a hidden view falls
 * back to the deploy's FIRST allowed view (never 404s, never renders a
 * hidden surface). With nothing narrowed, upstream behavior is unchanged.
 */
export function parseAllowedBeatsView(
  viewParam: string | null,
  surfaces: readonly BeatsView[],
): BeatsView {
  const view = parseBeatsView(viewParam);
  return surfaces.includes(view) ? view : surfaces[0];
}

const PRIMARY_TABS: readonly BeatsView[] = [
  "board", "projects", "artifacts", "review",
];
const MORE_TAB_ORDER: readonly BeatsView[] = [
  "setlist", "overview", "queues", "active",
  "finalcut", "retakes", "history", "diagnostics",
];

/** Which header tabs render, given the deploy's allowed surfaces. */
export function selectViewTabs(surfaces: readonly BeatsView[]): {
  primary: BeatsView[];
  more: BeatsView[];
} {
  return {
    primary: PRIMARY_TABS.filter((v) => surfaces.includes(v)),
    more: MORE_TAB_ORDER.filter((v) => surfaces.includes(v)),
  };
}
