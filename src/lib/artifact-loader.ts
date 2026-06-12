// artifact-loader — reads a task's compiled HTML output from
// html-artifacts/docs/beads/<id>.html for inlining in /artifacts/[id].
// Sibling of daily-loader: same injected-fs hermetic shape, same
// body-extraction semantics (head styles hoisted into the fragment).

import { extractBodyContent } from "@/lib/daily-loader";

export interface ArtifactLoaderFs {
  exists: (path: string) => boolean;
  read: (path: string) => string;
}

export interface ArtifactLoadResult {
  /** Chrome-free fragment, head styles hoisted, ready to inline. */
  body: string;
  /** <title> from the artifact document, else null. */
  title: string | null;
}

export interface LoadArtifactOptions {
  /** Absolute path to the beads artifact root (…/docs/beads). */
  root: string;
  fs: ArtifactLoaderFs;
}

/** Bead ids are lowercase slug-dotted; anything else could escape root. */
const BEAD_ID_RE = /^[a-z0-9][a-z0-9.-]*$/;

/** A non-bead-id reached the loader — fail loud, never touch the fs. */
export class ArtifactIdError extends Error {
  constructor(id: string) {
    super(
      `SPANDA ARTIFACT LOADER FAILURE: "${id}" is not a valid bead id `
      + `(expected ${BEAD_ID_RE}); refusing to read from disk.`,
    );
    this.name = "ArtifactIdError";
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

export function loadArtifact(
  beadId: string,
  opts: LoadArtifactOptions,
): ArtifactLoadResult | null {
  if (!BEAD_ID_RE.test(beadId)) throw new ArtifactIdError(beadId);
  const path = `${opts.root}/${beadId}.html`;
  if (!opts.fs.exists(path)) return null;
  const html = opts.fs.read(path);
  return { body: extractBodyContent(html), title: extractTitle(html) };
}
