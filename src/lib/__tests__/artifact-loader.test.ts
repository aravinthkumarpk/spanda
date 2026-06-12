/**
 * artifact-loader: reads a task's compiled HTML output
 * (html-artifacts/docs/beads/<id>.html) for inlining in /artifacts/[id].
 *
 * Behaviors: a tagged bead's artifact renders; a missing file is an honest
 * null (empty state, not a crash); an id that isn't a plain bead id is
 * rejected loudly (path traversal).
 */
import { describe, expect, it } from "vitest";

import { loadArtifact, ArtifactIdError } from "@/lib/artifact-loader";

const ROOT = "/artifacts/docs/beads";

function fakeFs(files: Record<string, string>) {
  return {
    exists: (p: string) => p in files,
    read: (p: string) => {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
  };
}

describe("loadArtifact", () => {
  it("returns the inlinable body for a bead whose artifact exists", () => {
    const fs = fakeFs({
      [`${ROOT}/personal-os-5wo.html`]:
        "<html><head><title>MVP</title><style>.x{}</style></head>"
        + "<body><h1>Plan</h1></body></html>",
    });
    const result = loadArtifact("personal-os-5wo", { root: ROOT, fs });
    expect(result).not.toBeNull();
    expect(result?.body).toContain("<h1>Plan</h1>");
    expect(result?.body).toContain("<style>.x{}</style>"); // styles hoisted
    expect(result?.title).toBe("MVP");
  });

  it("returns null when the artifact file does not exist", () => {
    const result = loadArtifact("personal-os-xyz", {
      root: ROOT,
      fs: fakeFs({}),
    });
    expect(result).toBeNull();
  });

  it("rejects ids that are not plain bead ids — never touches the fs", () => {
    let touched = false;
    const spyFs = {
      exists: () => { touched = true; return true; },
      read: () => { touched = true; return "x"; },
    };
    for (const bad of [
      "../../../etc/passwd",
      "a/b",
      "a\\b",
      "id with space",
      "UPPER-case",
      "",
    ]) {
      expect(() => loadArtifact(bad, { root: ROOT, fs: spyFs }))
        .toThrow(ArtifactIdError);
    }
    expect(touched).toBe(false);
  });
});
