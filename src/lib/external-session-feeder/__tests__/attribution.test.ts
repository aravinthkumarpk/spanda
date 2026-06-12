/**
 * Attribution: which repo (and beat) a session belongs to, from its cwd.
 * The 5wo.2 eng review's rule: mis-attribution is worse than unattributed —
 * ambiguity NEVER guesses.
 */
import { describe, expect, it } from "vitest";

import {
  attributeRun,
} from "@/lib/external-session-feeder/attribution";

const REPOS = ["/home/u/personal-os", "/home/u/code/spanda"];

describe("attributeRun", () => {
  it("attributes a cwd inside a registered repo to that repo", () => {
    expect(
      attributeRun("/home/u/code/spanda/src", REPOS, {}),
    ).toEqual({ repoPath: "/home/u/code/spanda", beatId: undefined });
  });

  it("attributes a worktree cwd to its parent repo", () => {
    expect(
      attributeRun(
        "/home/u/code/spanda/.claude/worktrees/x", REPOS, {},
      ).repoPath,
    ).toBe("/home/u/code/spanda");
  });

  it("returns unattributed for a cwd outside every repo", () => {
    expect(attributeRun("/tmp/scratch", REPOS, {})).toEqual({
      repoPath: undefined,
      beatId: undefined,
    });
  });

  it("does not attribute a repo that merely shares a path prefix", () => {
    expect(
      attributeRun("/home/u/personal-os-backup", REPOS, {}).repoPath,
    ).toBeUndefined();
  });

  it("pins the beat only when the repo has exactly ONE in-flight beat", () => {
    const oneBeat = { "/home/u/code/spanda": ["spanda-a1"] };
    expect(
      attributeRun("/home/u/code/spanda", REPOS, oneBeat).beatId,
    ).toBe("spanda-a1");
    const twoBeats = { "/home/u/code/spanda": ["spanda-a1", "spanda-b2"] };
    expect(
      attributeRun("/home/u/code/spanda", REPOS, twoBeats).beatId,
    ).toBeUndefined();
  });
});
