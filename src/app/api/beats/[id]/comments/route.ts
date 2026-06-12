// GET/POST /api/beats/[id]/comments — the artifact commenter's API.
// Comments live on the bead itself (bd comments), so the next agent run
// sees them with the task. The bd CLI is the write path (the jsonl store
// only carries comment_count); exec cwd = the repo from `_repo`.
import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/bd-internal";
import {
  addBeadComment,
  listBeadComments,
  CommentValidationError,
  CommentBackendError,
} from "@/lib/bead-comments";

function execIn(repoPath?: string) {
  return (args: string[]) => exec(args, { cwd: repoPath });
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof CommentValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof CommentBackendError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repoPath =
    request.nextUrl.searchParams.get("_repo") || undefined;
  try {
    const comments = await listBeadComments(id, execIn(repoPath));
    return NextResponse.json({ data: comments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repoPath =
    request.nextUrl.searchParams.get("_repo") || undefined;
  let text: unknown;
  try {
    ({ text } = (await request.json()) as { text?: unknown });
  } catch {
    return NextResponse.json(
      { error: "body must be JSON: {text}" }, { status: 400 },
    );
  }
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "body must be JSON: {text: string}" }, { status: 400 },
    );
  }
  try {
    await addBeadComment(id, text, execIn(repoPath));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
