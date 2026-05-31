import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import type { RegisteredRepo } from "@/lib/registry";
import { serverLog } from "@/lib/server-logger";
import { bdSyncCommands } from "@/lib/bd-sync-commands";

const execFile = promisify(execFileCallback);

export interface BeatsSyncRunResult {
  ok: boolean;
  error?: string;
  stdout?: string;
  stderr?: string;
  command: string;
}

export interface BeatsSyncRunnerDeps {
  execFile?: (
    file: string,
    args: string[],
    options: { cwd: string },
  ) => Promise<{ stdout?: string; stderr?: string }>;
}

// The reconcile command sequence for a repo. knots → `kno sync`; beads → the
// bd ≥ 1.0 directional commands (`import` then `export`) sourced from the one
// tested mapper (F2 / ADR-0005). bd's `sync` was removed at 1.0.
export function commandsFor(repo: RegisteredRepo): {
  file: string;
  args: string[];
}[] {
  if (repo.memoryManagerType === "knots") {
    return [{ file: "kno", args: ["sync"] }];
  }
  return bdSyncCommands("reconcile", false).map((args) => ({
    file: "bd",
    args,
  }));
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runRepoSync(
  repo: RegisteredRepo,
  deps: BeatsSyncRunnerDeps = {},
): Promise<BeatsSyncRunResult> {
  const commands = commandsFor(repo);
  const command = commands.map((c) => [c.file, ...c.args].join(" ")).join(" && ");
  const run = deps.execFile ?? execFile;
  let stdout = "";
  let stderr = "";
  // Best-effort sequence (ADR-0005): run each; a failure is logged and
  // returned as ok:false but never thrown — the caller treats sync as
  // non-fatal so a reconcile hiccup can't break a user's write.
  for (const { file, args } of commands) {
    try {
      const result = await run(file, args, { cwd: repo.path });
      stdout += result.stdout ?? "";
      stderr += result.stderr ?? "";
    } catch (error) {
      const message = formatError(error);
      serverLog("warn", "beats-sync", "repo sync failed", {
        repoPath: repo.path,
        memoryManagerType: repo.memoryManagerType,
        command: [file, ...args].join(" "),
        error: message,
      });
      return {
        ok: false,
        command,
        error: message,
        stdout: stdout + (errorOutput(error, "stdout") ?? ""),
        stderr: stderr + (errorOutput(error, "stderr") ?? ""),
      };
    }
  }
  return { ok: true, command, stdout, stderr };
}

function errorOutput(error: unknown, key: "stdout" | "stderr"): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
