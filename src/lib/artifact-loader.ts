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

/** A relative artifact path that could escape the docs root — fail loud. */
export class ArtifactPathError extends Error {
  constructor(relPath: string) {
    super(
      `SPANDA ARTIFACT LOADER FAILURE: "${relPath}" is not a safe docs-relative `
      + `.html path; refusing to read from disk.`,
    );
    this.name = "ArtifactPathError";
  }
}

/** Each path segment: dot-slug, never "." / ".." / empty. */
const SEGMENT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function isSafeRelPath(relPath: string): boolean {
  if (!relPath || !relPath.endsWith(".html")) return false;
  if (relPath.startsWith("/") || relPath.includes("\\")) return false;
  const segs = relPath.split("/");
  return segs.every((s) => s !== ".." && s !== "." && SEGMENT_RE.test(s));
}

/**
 * Catch-all loader: render any docs-relative artifact (`<root>/<relPath>`).
 * Same hermetic shape as loadArtifact; the path is validated BEFORE any fs
 * touch so a traversal attempt never reaches the disk.
 */
export function loadArtifactByPath(
  relPath: string,
  opts: LoadArtifactOptions,
): ArtifactLoadResult | null {
  if (!isSafeRelPath(relPath)) throw new ArtifactPathError(relPath);
  const path = `${opts.root}/${relPath}`;
  if (!opts.fs.exists(path)) return null;
  const html = opts.fs.read(path);
  return { body: extractBodyContent(html), title: extractTitle(html) };
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
