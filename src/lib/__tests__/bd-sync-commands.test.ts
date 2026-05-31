/**
 * F2 (iteration 2.2) — the `bd sync` → `import`/`export` mapping. On bd ≥ 1.0
 * (no `sync`), reconcile = import then export; the write auto-heal = import;
 * the DB→jsonl flush = export. Legacy bd keeps `sync`.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  bdSyncCommands,
  bdHasSync,
  __resetBdHasSyncCache,
} from "@/lib/bd-sync-commands";

afterEach(() => __resetBdHasSyncCache());

describe("bdSyncCommands — bd ≥ 1.0 (no sync)", () => {
  it("reconcile = import then export", () => {
    expect(bdSyncCommands("reconcile", false)).toEqual([
      ["import"],
      ["export"],
    ]);
  });
  it("import-only = import (the write auto-heal)", () => {
    expect(bdSyncCommands("import-only", false)).toEqual([["import"]]);
  });
  it("export-only = export (flush DB→jsonl)", () => {
    expect(bdSyncCommands("export-only", false)).toEqual([["export"]]);
  });
});

describe("bdSyncCommands — legacy bd (has sync)", () => {
  it("reconcile/export use sync --no-daemon", () => {
    expect(bdSyncCommands("reconcile", true)).toEqual([
      ["sync", "--no-daemon"],
    ]);
  });
  it("import-only uses sync --import-only", () => {
    expect(bdSyncCommands("import-only", true)).toEqual([
      ["sync", "--import-only"],
    ]);
  });
});

describe("bdHasSync — capability probe (cached)", () => {
  it("false when bd reports unknown command", async () => {
    let calls = 0;
    const exec = async () => {
      calls += 1;
      return { exitCode: 1, stderr: 'unknown command "sync" for "bd"' };
    };
    expect(await bdHasSync(exec)).toBe(false);
    await bdHasSync(exec); // cached — no second probe
    expect(calls).toBe(1);
  });

  it("true when the probe succeeds", async () => {
    const exec = async () => ({ exitCode: 0, stderr: "" });
    expect(await bdHasSync(exec)).toBe(true);
  });
});
