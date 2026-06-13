# Plan 006: Validate the `_repo` query param against the registry before using it as a process cwd

> **Executor instructions**: Follow step by step, verify each. STOP conditions halt you. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat d27ae764..HEAD -- src/app/api/beats/'[id]'/comments/route.ts src/lib/registry.ts`. Mismatch = STOP.

## Status
- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security (hardening)
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
The comments API route takes a `_repo` query parameter and passes it **straight to `bd`'s working directory** (`execFile` `cwd`) with no validation. Today this is low-risk: Spanda is a single-operator tool behind a Cloudflare Access tunnel, and the worst case is pointing `bd` at a non-repo dir (which fails). But an unvalidated request-controlled `cwd` for a child process is exactly the kind of latent footgun that becomes critical the day the trust boundary changes (a second user, an exposed port, a CSRF). Validating `_repo` against the known registry — the same list the rest of the app already trusts — closes it for the cost of a few lines, and makes the failure *loud* (a 400 naming the bad repo) instead of a confusing `bd` error.

## Current state
- `src/app/api/beats/[id]/comments/route.ts`:
  - `:34` (GET) `const repoPath = request.nextUrl.searchParams.get("_repo") || undefined;`
  - `:49` (POST) same.
  - `:15` `function execIn(repoPath?: string) { return (args) => exec(args, { cwd: repoPath }); }` — `repoPath` flows directly to `bd-internal.ts`'s `execFile(BD_BIN, args, { cwd })`. (Note: `exec` uses `execFile` with an argv array, so command-injection is NOT the issue — only the unvalidated `cwd` is.)
- `src/lib/registry.ts` — the source of registered repos. It exposes the registered repo paths (find the exported reader — e.g. `listRepos()` / `getRegisteredRepos()` / `loadRegistry()`; `scripts/session-feeder.ts:39-50` reads `~/.config/foolery/registry.json` directly as a precedent for "the set of allowed repo paths"). Use the in-app registry reader, not a re-read of the file, if one is exported.

**Convention**: API routes that resolve a backend wrap failures via `withDispatchFailureHandling` / return a structured error (see `src/lib/backend-http.ts` and other `src/app/api/**` routes). A bad/unknown `_repo` should return **400** with a clear message — consistent with how the route already returns 400 for a bad body.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `bunx tsc --noEmit` (after `rm -rf .next/types`) | exit 0 |
| Tests | `bunx vitest run --project unit src/lib/__tests__/comments-route.test.ts` (create or extend) | pass |
| Lint | `bun run lint` | exit 0 |
| Find registry reader | `grep -nE "export (function|const).*[Rr]epo" src/lib/registry.ts` | shows the exported reader to use |

## Scope
**In scope**:
- `src/app/api/beats/[id]/comments/route.ts` — add `_repo` validation.
- `src/lib/__tests__/comments-route.test.ts` — add a test (this may be created by plan 005; if so, extend it; if 005 hasn't run, create it).
- If (and only if) the registry has no usable exported "is this path registered?" reader, add a tiny pure helper to `src/lib/registry.ts` (e.g. `isRegisteredRepo(path): boolean`) — but check first; prefer reusing what exists.

**Out of scope**:
- `src/lib/bd-internal.ts` — the `execFile` usage is correct (argv array); don't touch it.
- Other routes that take `_repo` — if you want to apply the same guard app-wide, that's a SEPARATE follow-up; this plan scopes to the comments route to keep risk low. Note other sites in the maintenance section.

## Steps

### Step 1: Resolve the allowed repo set
Identify the exported registry reader in `src/lib/registry.ts` (grep above). Confirm it returns the list of registered repo paths the app already trusts.
**Verify**: `grep -nE "export" src/lib/registry.ts | grep -i repo` shows a reader you can call from a route.

### Step 2: Reject unregistered `_repo` with 400
In the comments route, after reading `_repo`: if it is present but not in the registered set, return `NextResponse.json({ error: \`unknown repo: ${repoPath}\` }, { status: 400 })` before any `exec`. If `_repo` is absent, keep current behavior (let the backend resolve the default — do not newly require it). Match the route's existing 400 style.
**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 3: Test it
Add cases to `comments-route.test.ts`: a registered `_repo` → proceeds (mock the registry reader + `addBeadComment`); an unregistered `_repo` → 400, and `addBeadComment` is **never called** (assert the mock got 0 calls — proving validation happens before exec).
**Verify**: `bunx vitest run --project unit src/lib/__tests__/comments-route.test.ts` → pass, including the "exec not reached on bad repo" assertion.

## Test plan
- 2 new cases (registered → ok, unregistered → 400 + exec-not-called). Mock the registry reader and `@/lib/bead-comments`. Model on the route-test mocking style in `src/lib/__tests__/approvals-route.test.ts`.
- Verification: the vitest command in Step 3.

## Done criteria
- [ ] An unregistered `_repo` returns 400 and never reaches `bd` exec
- [ ] A registered `_repo` still works
- [ ] `bunx tsc --noEmit` + `bun run lint` exit 0
- [ ] `bunx vitest run --project unit src/lib/__tests__/comments-route.test.ts` passes incl. the new cases
- [ ] No out-of-scope files modified
- [ ] `plans/README.md` row updated

## STOP conditions
- The registry's exported reader doesn't exist or returns something other than repo paths — report what you found before adding a new helper.
- Validating `_repo` breaks a legitimate caller that passes a path not in the registry on purpose (check how the client builds the `_repo` value — `src/components/artifact-comments.tsx` builds it from `activeRepo`/registered repos, so registered paths should always pass; confirm) — if a real caller would 400, report.

## Maintenance notes
- Other `src/app/api/**` routes also read `_repo` and pass it as `cwd` (grep `searchParams.get("_repo")`). Applying the same guard there is a sensible follow-up; deferred from this plan to keep the blast radius small.
- Reviewer: confirm the 400 happens *before* any `exec`/`bd` call (the test's "never called" assertion is the proof), and that absent-`_repo` behavior is unchanged.
