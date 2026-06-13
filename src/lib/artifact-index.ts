// artifact-index — the pure parser behind artifact-index.json.
//
// Single source of truth for a bead↔artifact link is a <meta> tag INSIDE the
// artifact. This module turns one artifact (repo-relative path + HTML) into an
// index entry. The fs scan + json write live in the gen script; this stays
// pure + hermetic.

export type ArtifactKind =
  | "output" | "plan" | "weekly" | "daily" | "example" | "doc";

export interface ArtifactEntry {
  /** repo-relative path under docs/, e.g. "beads/personal-os-5wo.html" */
  path: string;
  /** beads this artifact is the output of (0 = unlinked library doc) */
  beads: string[];
  kind: ArtifactKind;
  title: string;
}

const FOLDER_KIND: Record<string, ArtifactKind> = {
  beads: "output",
  plans: "plan",
  weekly: "weekly",
  daily: "daily",
  examples: "example",
};

const VALID_KINDS = new Set<ArtifactKind>([
  "output", "plan", "weekly", "daily", "example", "doc",
]);

function topFolder(relPath: string): string {
  return relPath.split("/")[0] ?? "";
}

function metaContent(html: string, name: string): string | null {
  // <meta name="spanda:bead" content="..."> — attribute order-insensitive.
  const re = new RegExp(
    `<meta[^>]*\\bname=["']${name}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? null;
}

function deriveKind(relPath: string, html: string): ArtifactKind {
  const override = metaContent(html, "spanda:kind");
  if (override && VALID_KINDS.has(override as ArtifactKind)) {
    return override as ArtifactKind;
  }
  return FOLDER_KIND[topFolder(relPath)] ?? "doc";
}

function deriveBeads(relPath: string, html: string): string[] {
  const meta = metaContent(html, "spanda:bead");
  if (meta !== null) {
    return meta.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Filename fallback applies ONLY inside beads/ (a task output named by id).
  if (topFolder(relPath) === "beads") {
    const stem = relPath.split("/").pop()?.replace(/\.html$/, "") ?? "";
    return stem ? [stem] : [];
  }
  return [];
}

function deriveTitle(relPath: string, html: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (t) return t;
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, "").trim();
  if (h1) return h1;
  return relPath.split("/").pop()?.replace(/\.html$/, "") ?? relPath;
}

export function parseArtifact(relPath: string, html: string): ArtifactEntry {
  return {
    path: relPath,
    beads: deriveBeads(relPath, html),
    kind: deriveKind(relPath, html),
    title: deriveTitle(relPath, html),
  };
}

export interface IndexEntry extends ArtifactEntry {
  /** epoch ms of the source file's last modification. */
  mtime: number;
}

export interface ScannedFile {
  path: string;
  html: string;
  mtime: number;
}

/** Pure: turn scanned files into the index, newest-first. */
export function buildIndex(files: readonly ScannedFile[]): IndexEntry[] {
  return files
    .map((f) => ({ ...parseArtifact(f.path, f.html), mtime: f.mtime }))
    .sort((a, b) => b.mtime - a.mtime);
}

/** Entries that belong on the work Library (output/plan/weekly/daily, and a
 *  `doc` only when it's linked to a bead). Examples + orphan docs excluded. */
const WORK_KINDS = new Set<ArtifactKind>(["output", "plan", "weekly", "daily"]);
export function selectLibraryEntries(
  entries: readonly IndexEntry[],
): IndexEntry[] {
  return entries.filter(
    (e) => WORK_KINDS.has(e.kind) || (e.kind === "doc" && e.beads.length > 0),
  );
}

/** Entries that are the output of a given bead (per-bead "Outputs" list). */
export function artifactsForBead(
  entries: readonly IndexEntry[],
  beadId: string,
): IndexEntry[] {
  return entries.filter((e) => e.beads.includes(beadId));
}
