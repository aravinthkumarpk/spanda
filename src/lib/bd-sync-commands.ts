/**
 * bd-sync-commands — map a logical reconcile op to the right `bd` CLI
 * command(s), capability-aware (F2 / ADR-0005).
 *
 * `bd` ≤ 0.x had a single `sync` subcommand; `bd` ≥ 1.0 removed it in favour of
 * `import` (jsonl → DB) and `export` (DB → jsonl). Our code targeted `sync`, so
 * every reconcile errored on the installed v1.0.4 ("unknown command sync").
 * This is the single place that knows the mapping; callers pass the detected
 * capability and run the returned command(s) best-effort.
 *
 *   reconcile   = both directions (pull external jsonl edits, then flush DB)
 *   import-only = jsonl → DB (the write auto-heal: re-import then retry)
 *   export-only = DB → jsonl (flush direct DB writes back to the git export)
 */

export type BdSyncMode = "reconcile" | "import-only" | "export-only";

export function bdSyncCommands(
  mode: BdSyncMode,
  hasSync: boolean,
): string[][] {
  if (hasSync) {
    if (mode === "import-only") return [["sync", "--import-only"]];
    // reconcile + export-only both collapse to the one legacy sync.
    return [["sync", "--no-daemon"]];
  }
  // bd ≥ 1.0: no `sync` — use the directional commands.
  if (mode === "import-only") return [["import"]];
  if (mode === "export-only") return [["export"]];
  return [["import"], ["export"]];
}

type ExecLike = (
  file: string,
  args: string[],
) => Promise<{ exitCode?: number; stderr?: string }>;

let cachedHasSync: boolean | undefined;

/**
 * Detect once (cached) whether the installed `bd` still has `sync`. Probes
 * `bd sync --help`; a non-zero exit / "unknown command" means it doesn't.
 * `exec` is injectable for tests; `reset` clears the cache.
 */
export async function bdHasSync(exec: ExecLike): Promise<boolean> {
  if (cachedHasSync !== undefined) return cachedHasSync;
  try {
    const { exitCode, stderr } = await exec("bd", ["sync", "--help"]);
    cachedHasSync = (exitCode ?? 0) === 0
      && !/unknown command/i.test(stderr ?? "");
  } catch {
    cachedHasSync = false;
  }
  return cachedHasSync;
}

/** @internal test seam */
export function __resetBdHasSyncCache(): void {
  cachedHasSync = undefined;
}
