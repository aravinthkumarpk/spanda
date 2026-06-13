// GET /api/artifacts — the artifact index the Library + beat-detail read.
// Serves the generated artifact-index.json (producer-written, ~15-min cron
// floor). Missing file → empty list (the index hasn't been built yet); the
// gen script is the builder, not this route.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { IndexEntry } from "@/lib/artifact-index";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INDEX_PATH =
  process.env.SPANDA_ARTIFACT_INDEX
  ?? join(homedir(), ".local", "share", "foolery", "artifact-index.json");

export async function GET() {
  let data: IndexEntry[] = [];
  if (existsSync(INDEX_PATH)) {
    try {
      data = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as IndexEntry[];
    } catch {
      data = [];
    }
  }
  return NextResponse.json({ data });
}
