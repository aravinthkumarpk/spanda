/**
 * bead-comments: the write+read loop behind the artifact commenter.
 * A comment lands on the task itself (bd comments), so the next agent
 * run sees it — no sidecar comment store.
 */
import { describe, expect, it } from "vitest";

import {
  addBeadComment,
  listBeadComments,
  CommentValidationError,
  CommentBackendError,
} from "@/lib/bead-comments";

type Call = { args: string[] };

function fakeExec(
  result: { stdout?: string; stderr?: string; exitCode?: number } = {},
) {
  const calls: Call[] = [];
  const exec = (args: string[]) => {
    calls.push({ args });
    return Promise.resolve({
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    });
  };
  return { exec, calls };
}

describe("addBeadComment", () => {
  it("adds the comment via `bd comment <id> <text>`", async () => {
    const { exec, calls } = fakeExec();
    await addBeadComment("personal-os-5wo", "ship it", exec);
    expect(calls).toEqual([
      { args: ["comment", "personal-os-5wo", "ship it"] },
    ]);
  });

  it("rejects empty / whitespace / oversize text without touching bd", async () => {
    const { exec, calls } = fakeExec();
    for (const bad of ["", "   ", "\n\t", "x".repeat(4001)]) {
      await expect(addBeadComment("personal-os-5wo", bad, exec))
        .rejects.toThrow(CommentValidationError);
    }
    expect(calls).toEqual([]);
  });

  it("rejects a malformed bead id without touching bd", async () => {
    const { exec, calls } = fakeExec();
    await expect(addBeadComment("../evil", "hi", exec))
      .rejects.toThrow(CommentValidationError);
    expect(calls).toEqual([]);
  });

  it("surfaces a bd failure loudly with its stderr — never a silent ok", async () => {
    const { exec } = fakeExec({
      exitCode: 1,
      stderr: "Error: issue not found: personal-os-zzz",
    });
    await expect(addBeadComment("personal-os-zzz", "hi", exec))
      .rejects.toThrow(/issue not found/);
    await expect(addBeadComment("personal-os-zzz", "hi", exec))
      .rejects.toThrow(CommentBackendError);
  });
});

describe("listBeadComments", () => {
  it("maps `bd comments <id> --json` to BeadComment[]", async () => {
    const { exec, calls } = fakeExec({
      stdout: JSON.stringify([
        {
          id: "u1",
          issue_id: "personal-os-5wo",
          author: "Aravinth Kumar",
          text: "looks right",
          created_at: "2026-06-12T16:38:35Z",
        },
      ]),
    });
    const comments = await listBeadComments("personal-os-5wo", exec);
    expect(calls).toEqual([
      { args: ["comments", "personal-os-5wo", "--json"] },
    ]);
    expect(comments).toEqual([
      {
        id: "u1",
        author: "Aravinth Kumar",
        text: "looks right",
        createdAt: "2026-06-12T16:38:35Z",
      },
    ]);
  });

  it("treats a no-comments bead as an empty list", async () => {
    const { exec } = fakeExec({ stdout: "" });
    expect(await listBeadComments("personal-os-5wo", exec)).toEqual([]);
  });
});
