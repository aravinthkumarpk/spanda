#!/usr/bin/env bun
/**
 * session-feeder — the run & blocker inbox's runner (5wo.1 + 5wo.2).
 *
 * Scans ~/.claude/projects/** transcripts, classifies each session
 * (running / blocked / done) with the tested feeder lib, attributes it to a
 * registered repo, ingests idempotently into a JSON run-feed, and DMs on
 * stall/land transitions. Spanda's /today reads the same feed for its runs
 * strip.
 *
 * Environment-coupled BY DESIGN (real fs, registry, DM script) — the logic
 * it composes is unit-tested in src/lib/external-session-feeder; this file
 * is deliberately just plumbing. Run on a hermes cron every ~10 minutes:
 *   cd ~/code/spanda && bun scripts/session-feeder.ts
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import { parseClaudeSession } from "../src/lib/external-session-feeder/parse";
import { classifyRunStatus } from "../src/lib/external-session-feeder/classify";
import { ingestSessions } from "../src/lib/external-session-feeder/ingest";
import { attributeRun } from "../src/lib/external-session-feeder/attribution";
import { diffNotifications } from "../src/lib/external-session-feeder/notify";
import type { RunRecord } from "../src/lib/external-session-feeder/types";

const HOME = homedir();
const TRANSCRIPTS_ROOT = join(HOME, ".claude", "projects");
const FEED_PATH = process.env.SPANDA_RUN_FEED
  ?? join(HOME, ".local", "share", "foolery", "run-feed.json");
const REGISTRY_PATH = join(HOME, ".config", "foolery", "registry.json");
const DM_SCRIPT = join(HOME, ".hermes", "scripts", "slack-dm-aravinth.sh");
const THRESHOLDS = { staleMs: 10 * 60_000, doneMs: 6 * 3_600_000 };
const SCAN_WINDOW_MS = 48 * 3_600_000;

function repoPaths(): string[] {
  try {
    const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as {
      repos?: { path?: string }[];
    };
    return (reg.repos ?? [])
      .map((r) => r.path)
      .filter((p): p is string => typeof p === "string");
  } catch {
    return [];
  }
}

function transcriptFiles(): string[] {
  if (!existsSync(TRANSCRIPTS_ROOT)) return [];
  const out: string[] = [];
  const cutoff = Date.now() - SCAN_WINDOW_MS;
  for (const dir of readdirSync(TRANSCRIPTS_ROOT)) {
    const dirPath = join(TRANSCRIPTS_ROOT, dir);
    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith(".jsonl")) continue;
      const p = join(dirPath, f);
      try {
        if (statSync(p).mtimeMs >= cutoff) out.push(p);
      } catch { /* raced deletion — skip */ }
    }
  }
  return out;
}

function loadFeed(): Map<string, RunRecord> {
  try {
    const raw = JSON.parse(readFileSync(FEED_PATH, "utf8")) as RunRecord[];
    return new Map(raw.map((r) => [r.sessionId, r]));
  } catch {
    return new Map();
  }
}

function dm(message: string): void {
  // Quiet mode for the seeding run: a first scan over 48h of history would
  // otherwise DM every long-idle session as a fresh stall.
  if (process.env.SPANDA_FEEDER_QUIET === "1") {
    console.log(`[session-feeder] (quiet) would DM: ${message.split("\n")[0]}`);
    return;
  }
  try {
    execFileSync("bash", [DM_SCRIPT], { input: message, timeout: 20_000 });
  } catch (err) {
    console.error(`[session-feeder] DM failed: ${String(err)}`);
  }
}

function main(): void {
  const repos = repoPaths();
  const now = Date.now();
  const incoming: RunRecord[] = [];

  for (const file of transcriptFiles()) {
    let parsed;
    try {
      parsed = parseClaudeSession(readFileSync(file, "utf8"));
    } catch {
      continue; // partial line mid-write — next scan picks it up
    }
    if (!parsed) continue;
    const status = classifyRunStatus(parsed, THRESHOLDS, { now });
    const attribution = attributeRun(parsed.cwd ?? "", repos, {});
    incoming.push({
      sessionId: parsed.sessionId,
      sourceHash: parsed.sourceHash,
      status,
      repoPath: attribution.repoPath,
      title: parsed.title,
      lastEventAtMs: parsed.lastEventAtMs,
    });
  }

  const prev = loadFeed();
  const { store, changed } = ingestSessions(prev, incoming);
  const notifications = diffNotifications(prev, store);

  mkdirSync(join(FEED_PATH, ".."), { recursive: true });
  writeFileSync(
    FEED_PATH,
    JSON.stringify([...store.values()], null, 1),
  );

  for (const n of notifications) {
    const label = n.title ?? n.sessionId.slice(0, 8);
    dm(
      n.kind === "stall"
        ? `🟠 *Run blocked* — ${label}\nNeeds you: open Spanda → Today.`
        : `✅ *Run landed* — ${label}`,
    );
  }

  console.log(
    `[session-feeder] scanned=${incoming.length} changed=${changed.length}`
    + ` notified=${notifications.length} feed=${FEED_PATH}`,
  );
}

main();
