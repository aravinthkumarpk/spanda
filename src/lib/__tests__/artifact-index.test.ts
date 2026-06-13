/**
 * artifact-index: the pure parser behind the generated artifact-index.json.
 * Given an artifact's repo-relative path + its HTML, derive {beads, kind,
 * title}. Resolution order for bead: meta spanda:bead → (beads/ folder only)
 * filename id → unlinked. Kind from top-level folder, meta override wins.
 */
import { describe, expect, it } from "vitest";

import {
  parseArtifact,
  buildIndex,
  selectLibraryEntries,
  artifactsForBead,
  groupLibraryByKind,
  artifactHref,
} from "@/lib/artifact-index";

describe("parseArtifact", () => {
  it("derives output kind + bead-from-filename for beads/<id>.html", () => {
    const e = parseArtifact(
      "beads/personal-os-5wo.html",
      "<html><head><title>MVP closure</title></head><body>x</body></html>",
    );
    expect(e.kind).toBe("output");
    expect(e.beads).toEqual(["personal-os-5wo"]);
    expect(e.title).toBe("MVP closure");
    expect(e.path).toBe("beads/personal-os-5wo.html");
  });

  it("meta spanda:bead is canonical and overrides the filename (any folder)", () => {
    const e = parseArtifact(
      "plans/2026-06-04-scope-gaps.html",
      `<head><meta name="spanda:bead" content="personal-os-63e">`
      + `<title>Scope gaps</title></head>`,
    );
    expect(e.beads).toEqual(["personal-os-63e"]);
    expect(e.kind).toBe("plan");
  });

  it("meta spanda:bead accepts a comma-list (multi-bead)", () => {
    const e = parseArtifact(
      "plans/cross.html",
      `<meta name="spanda:bead" content="personal-os-a, personal-os-b">`,
    );
    expect(e.beads).toEqual(["personal-os-a", "personal-os-b"]);
  });

  it("meta spanda:kind overrides the folder-derived kind", () => {
    const e = parseArtifact(
      "beads/personal-os-x.html",
      `<meta name="spanda:kind" content="plan"><title>t</title>`,
    );
    expect(e.kind).toBe("plan");
  });

  it("infers kind from folder; non-beads folder w/o meta is unlinked", () => {
    expect(parseArtifact("daily/2026/05/31.html", "<title>d</title>").kind)
      .toBe("daily");
    expect(parseArtifact("weekly/W23.html", "<title>w</title>").kind)
      .toBe("weekly");
    expect(parseArtifact("examples/05-flow.html", "<title>e</title>").kind)
      .toBe("example");
    expect(parseArtifact("DESIGN.html", "<title>d</title>").kind)
      .toBe("doc");
    const daily = parseArtifact("daily/2026/05/31.html", "<title>d</title>");
    expect(daily.beads).toEqual([]); // time-report, no bead
  });

  it("titles from <title>, then <h1>, then the path stem", () => {
    expect(parseArtifact("x/a.html", "<h1>From <em>H1</em></h1>").title)
      .toBe("From H1");
    expect(parseArtifact("x/the-doc.html", "<body>no title</body>").title)
      .toBe("the-doc");
  });
});

describe("buildIndex / selectors", () => {
  const files = [
    { path: "beads/personal-os-5wo.html", html: "<title>out</title>", mtime: 100 },
    { path: "daily/2026/05/31.html", html: "<title>d</title>", mtime: 300 },
    { path: "examples/05-flow.html", html: "<title>e</title>", mtime: 200 },
    {
      path: "plans/p.html",
      html: `<meta name="spanda:bead" content="personal-os-5wo"><title>p</title>`,
      mtime: 250,
    },
  ];
  const idx = buildIndex(files);

  it("maps files to entries with mtime, newest-first", () => {
    expect(idx.map((e) => e.path)).toEqual([
      "daily/2026/05/31.html", "plans/p.html",
      "examples/05-flow.html", "beads/personal-os-5wo.html",
    ]);
    expect(idx[0].mtime).toBe(300);
  });

  it("Library keeps work kinds, excludes examples + orphan docs", () => {
    const lib = selectLibraryEntries(idx).map((e) => e.path);
    expect(lib).toContain("beads/personal-os-5wo.html");
    expect(lib).toContain("daily/2026/05/31.html");
    expect(lib).toContain("plans/p.html");
    expect(lib).not.toContain("examples/05-flow.html");
  });

  it("artifactsForBead finds every artifact linked to a bead (output + plan)", () => {
    const linked = artifactsForBead(idx, "personal-os-5wo").map((e) => e.path);
    expect(linked.sort()).toEqual(["beads/personal-os-5wo.html", "plans/p.html"]);
  });

  it("groups the Library into fixed-order sections, empty kinds omitted", () => {
    const sections = groupLibraryByKind(idx);
    expect(sections.map((s) => s.kind)).toEqual(["output", "plan", "daily"]);
    // example excluded entirely; weekly absent here so omitted
    expect(sections.find((s) => s.kind === "output")?.entries[0].path)
      .toBe("beads/personal-os-5wo.html");
  });

  it("artifactHref strips .html for the /artifacts URL", () => {
    expect(artifactHref({ path: "beads/personal-os-5wo.html" }))
      .toBe("/artifacts/beads/personal-os-5wo");
  });
});
