import { describe, expect, it, vi } from "vitest";
import { runRepoSync } from "@/lib/beats-sync-runner";
import type { RegisteredRepo } from "@/lib/registry";

function repo(memoryManagerType: "knots" | "beads"): RegisteredRepo {
  return {
    path: "/repo",
    name: "repo",
    addedAt: "2026-01-01T00:00:00.000Z",
    memoryManagerType,
  };
}

describe("beats sync runner", () => {
  it("runs kno sync for Knots repos", async () => {
    const execFile = vi.fn().mockResolvedValue({});
    const result = await runRepoSync(repo("knots"), { execFile });

    expect(result).toMatchObject({ ok: true, command: "kno sync" });
    expect(execFile).toHaveBeenCalledWith("kno", ["sync"], { cwd: "/repo" });
  });

  it("runs bd import then export for Beads repos (bd >= 1.0, no sync)", async () => {
    const execFile = vi.fn().mockResolvedValue({});
    const result = await runRepoSync(repo("beads"), { execFile });

    // F2 / ADR-0005: reconcile = import (jsonl->DB) then export (DB->jsonl).
    expect(result).toMatchObject({ ok: true, command: "bd import && bd export" });
    expect(execFile).toHaveBeenNthCalledWith(1, "bd", ["import"], { cwd: "/repo" });
    expect(execFile).toHaveBeenNthCalledWith(2, "bd", ["export"], { cwd: "/repo" });
  });

  it("returns failed sync diagnostics (best-effort, never throws)", async () => {
    const error = Object.assign(new Error("sync failed"), {
      stdout: "pulled 2",
      stderr: "conflict",
    });
    const execFile = vi.fn().mockRejectedValue(error);
    const result = await runRepoSync(repo("knots"), { execFile });

    expect(result).toMatchObject({
      ok: false,
      command: "kno sync",
      error: "sync failed",
    });
  });
});
