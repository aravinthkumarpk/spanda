# Plan 001: Render an artifact page from a single file read

> **Executor instructions**: Follow step by step. Run every verification command and confirm the expected result before the next step. If a "STOP condition" occurs, stop and report — do not improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat d27ae764..HEAD -- "src/app/artifacts/[...path]/page.tsx" src/lib/artifact-loader.ts src/lib/__tests__/artifact-loader.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
The artifact viewer route reads the same HTML file from disk **twice** per request: once inside `loadArtifactByPath` (to extract the body) and again in the page to parse the `spanda:bead` meta for the comment island. Besides the wasted I/O, the two reads can observe different bytes if an agent rewrites the artifact between them — the rendered body and the bead the comment box posts to would then disagree (a small TOCTOU). Reading once removes both problems.

## Current state
- `src/app/artifacts/[...path]/page.tsx` — the catch-all artifact viewer (server component, `force-dynamic`). Relevant lines:
  - `:78` `result = loadArtifactByPath(relPath, { root: DOCS_ROOT, fs: realFs });`
  - `:99` `const html = realFs.read(\`${DOCS_ROOT}/${relPath}\`);`  ← **second read of the same file**
  - `:100` `const beads = parseArtifact(relPath, html).beads;`
  - `:107` `{beads.length > 0 && <ArtifactComments beadId={beads[0]} />}`
- `src/lib/artifact-loader.ts` — `loadArtifactByPath(relPath, {root, fs})` reads the file once and returns `{ body, title } | null`:
  - `:13-18` `export interface ArtifactLoadResult { body: string; title: string | null; }`
  - `:88-95` reads `opts.fs.read(path)` then returns `{ body: extractBodyContent(html), title: extractTitle(html) }`
- `src/lib/artifact-index.ts` — `parseArtifact(relPath, html)` is a pure function returning `{ path, beads, kind, title }`.

**Convention**: the loader is hermetic via an injected `fs` adapter (`ArtifactLoaderFs` with `exists`/`read`). Keep that — do not call `node:fs` inside the lib. Tests pass a fake fs (see `src/lib/__tests__/artifact-loader.test.ts:15-23` `fakeFs`).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `bunx tsc --noEmit` | exit 0 (ignore any `.next/types` lines — run `rm -rf .next/types` first if they appear) |
| Tests | `bunx vitest run --project unit src/lib/__tests__/artifact-loader.test.ts` | all pass |
| Lint | `bun run lint` | exit 0 |

## Scope
**In scope**:
- `src/lib/artifact-loader.ts`
- `src/lib/__tests__/artifact-loader.test.ts`
- `src/app/artifacts/[...path]/page.tsx`

**Out of scope** (do NOT touch):
- `src/lib/artifact-index.ts` — `parseArtifact` already returns everything needed; reuse it.
- `src/components/artifact-comments.tsx` — its props don't change.

## Git workflow
- Branch: `advisor/001-artifact-single-read`.
- Commit message style (match `git log --oneline -5`): conventional, e.g. `fix(artifacts): render the viewer from a single file read`.
- Do NOT push or open a PR unless the operator says so.

## Steps

### Step 1: Have the loader return the raw HTML it already read
In `src/lib/artifact-loader.ts`, add `html: string` to `ArtifactLoadResult` and populate it in `loadArtifactByPath` (return the same `html` variable already read). Do the same for the bead-id variant `loadArtifact` for symmetry (it also has the `html` in hand).

**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 2: Make the page read once
In `src/app/artifacts/[...path]/page.tsx`, delete the line `const html = realFs.read(...)` (`:99`) and derive beads from the loader result instead:
```ts
const beads = result.html ? parseArtifact(relPath, result.html).beads : [];
```
(`result` is non-null here — the `if (!result) return <Message .../>` guard precedes this code.)

**Verify**: `grep -n "realFs.read" "src/app/artifacts/[...path]/page.tsx"` → only the occurrences inside the `realFs` adapter definition remain (the standalone re-read line is gone).

### Step 3: Add a regression test
In `src/lib/__tests__/artifact-loader.test.ts`, add a case under the `loadArtifactByPath` describe: a valid file's result includes the raw `html` (so the page can parse meta from it without a second read). Use the existing `fakeFs` helper and `DOCS` root in that file.

**Verify**: `bunx vitest run --project unit src/lib/__tests__/artifact-loader.test.ts` → all pass, including the new case.

## Test plan
- New test in `src/lib/__tests__/artifact-loader.test.ts`: assert `loadArtifactByPath(validPath, …)?.html` equals the file's HTML string. Model after the existing "renders body+title for a valid nested path" test directly above it.
- Verification: the vitest command in Step 3 passes.

## Done criteria
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bunx vitest run --project unit src/lib/__tests__/artifact-loader.test.ts` passes incl. the new `html` test
- [ ] `bun run lint` exits 0
- [ ] The standalone `realFs.read(...)` re-read line is removed from the page
- [ ] No files outside the in-scope list modified (`git status --porcelain`)
- [ ] `plans/README.md` row updated

## STOP conditions
- The page no longer calls `parseArtifact` / `loadArtifactByPath` as excerpted (drift) — stop and report.
- Adding `html` to `ArtifactLoadResult` breaks a consumer outside the in-scope files (grep `ArtifactLoadResult` first; if used elsewhere, report before proceeding).

## Maintenance notes
- If a future change makes artifacts large enough that holding the full HTML string twice (body + raw) matters, have `parseArtifact` accept just the `<head>` slice. Not a concern at current sizes (<200KB).
- Reviewer: confirm the page reads the file exactly once and the bead used for comments comes from the same bytes that rendered.
