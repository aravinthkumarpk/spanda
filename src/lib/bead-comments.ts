// bead-comments — add/list comments on a bead through the bd CLI.
// The artifact commenter's write+read loop: a comment on a task output
// lands on the TASK (bd comments), so agents see it on their next run.
// The exec dependency is injected (bd-internal's `exec` in production)
// so the module stays hermetic-testable.

export interface BeadComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CommentExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommentExec = (
  args: string[],
) => Promise<CommentExecResult>;

export const MAX_COMMENT_LENGTH = 4000;

/** Bead ids are lowercase slug-dotted — same grammar the artifact loader
 *  enforces. Anything else never reaches the bd CLI. */
const BEAD_ID_RE = /^[a-z0-9][a-z0-9.-]*$/;

/** Bad input stopped before bd — named so routes can map it to a 400. */
export class CommentValidationError extends Error {
  constructor(message: string) {
    super(`SPANDA COMMENT VALIDATION: ${message}`);
    this.name = "CommentValidationError";
  }
}

function validate(beadId: string, text?: string): void {
  if (!BEAD_ID_RE.test(beadId)) {
    throw new CommentValidationError(
      `"${beadId}" is not a valid bead id`,
    );
  }
  if (text !== undefined) {
    if (text.trim() === "") {
      throw new CommentValidationError("comment text is empty");
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new CommentValidationError(
        `comment exceeds ${MAX_COMMENT_LENGTH} chars`,
      );
    }
  }
}

/** bd itself failed — propagate its stderr, never downgrade to a warning. */
export class CommentBackendError extends Error {
  constructor(beadId: string, stderr: string) {
    super(
      `SPANDA COMMENT FAILURE: bd comment on ${beadId} failed: ${stderr}`,
    );
    this.name = "CommentBackendError";
  }
}

async function run(
  beadId: string,
  args: string[],
  exec: CommentExec,
): Promise<string> {
  const result = await exec(args);
  if (result.exitCode !== 0) {
    throw new CommentBackendError(beadId, result.stderr || result.stdout);
  }
  return result.stdout;
}

export async function addBeadComment(
  beadId: string,
  text: string,
  exec: CommentExec,
): Promise<void> {
  validate(beadId, text);
  await run(beadId, ["comment", beadId, text], exec);
}

interface RawComment {
  id: string;
  author?: string;
  text?: string;
  created_at?: string;
}

export async function listBeadComments(
  beadId: string,
  exec: CommentExec,
): Promise<BeadComment[]> {
  validate(beadId);
  const stdout = await run(
    beadId, ["comments", beadId, "--json"], exec,
  );
  if (stdout.trim() === "") return [];
  const raw = JSON.parse(stdout) as RawComment[];
  return raw.map((c) => ({
    id: c.id,
    author: c.author ?? "unknown",
    text: c.text ?? "",
    createdAt: c.created_at ?? "",
  }));
}
