# Plan 005: Test the new artifact surface (routes, hook, components)

> **Executor instructions**: Follow step by step, run every verification. STOP conditions halt you. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat d27ae764..HEAD -- src/app/api/artifacts src/app/api/beats/'[id]'/comments src/hooks/use-artifact-index.ts src/components/artifacts-view.tsx src/components/beat-outputs.tsx`. Mismatch = STOP.

## Status
- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: 001 (if 001 changes the loader signature, write tests against the post-001 shape) — otherwise none
- **Category**: tests
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
The bead↔artifact integration's **pure logic is well covered** (`artifact-index.test.ts` 11 tests, `artifact-loader.test.ts` 6, `bead-comments.test.ts` 6), but the **wiring around it is dark**: the `/api/artifacts` route's error recovery, the comments route's error→status mapping, the `useArtifactIndex` fetch failure path, and the two view components' loading/empty/error branches have logic and zero tests. These are exactly the seams where a refactor breaks behavior silently. Closing them turns the integration from "happy path tested" to "contract tested."

## Current state
Untested files with real branching logic:
- `src/app/api/artifacts/route.ts` — GET reads `SPANDA_ARTIFACT_INDEX` json; **missing file → `[]`, parse error → `[]`** (silent-by-design recovery). Untested.
- `src/app/api/beats/[id]/comments/route.ts` — maps `CommentValidationError → 400`, `CommentBackendError → 500`, generic → 500; non-string body → 400. The pure `addBeadComment`/`listBeadComments` are tested in `bead-comments.test.ts`; the **route's error-code mapping** is not.
- `src/hooks/use-artifact-index.ts` — `fetchArtifactIndex` throws on non-ok, parses `{data}`. Untested.
- `src/components/artifacts-view.tsx` — `useArtifactIndex` → `groupLibraryByKind` → sections; has loading/error/empty branches. `groupLibraryByKind` is pure-tested; the component's branch rendering is not.
- `src/components/beat-outputs.tsx` — `artifactsForBead(index, beadId)`; early-returns `null` when empty; single vs multi badge. Untested.

**Conventions** (match these):
- Unit tests live in `src/**/__tests__/*.test.ts(x)`, run via `bunx vitest run --project unit`. They MUST be hermetic (no real fs/net/clock) — see `docs/DEVELOPING.md` "Hermetic Test Policy". Inject/mock fs, fetch, and the query hook.
- Route tests: see existing API-route tests for the mocking style, e.g. `src/lib/__tests__/approvals-route.test.ts`, `beats-route-*.test.ts`. They construct a `NextRequest` and assert `response.status` + parsed body. Mock `node:fs` and the lib functions with `vi.mock`.
- Component/hook tests: search `src` for an existing `*.test.tsx` using `@testing-library/react` and `vi.mock` of a query hook (e.g. tests around `beat-detail` or `projects-view`) and mirror it. Mock `useArtifactIndex` (or the global `fetch`) — do not hit a real endpoint.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Run the new tests | `bunx vitest run --project unit <new test paths>` | all pass |
| Full unit suite | `bunx vitest run --project unit` | all pass |
| Typecheck | `bunx tsc --noEmit` (after `rm -rf .next/types`) | exit 0 |
| Lint | `bun run lint` | exit 0 |

## Scope
**In scope** (create these test files; do NOT modify the source under test except to export a symbol if strictly needed — if you must, STOP and report first):
- `src/lib/__tests__/artifacts-route.test.ts` (GET /api/artifacts)
- `src/lib/__tests__/comments-route.test.ts` (POST/GET /api/beats/[id]/comments error mapping)
- `src/hooks/__tests__/use-artifact-index.test.ts`
- `src/components/__tests__/beat-outputs.test.tsx`
- `src/components/__tests__/artifacts-view.test.tsx`

**Out of scope**:
- The source files under test (this is a coverage plan, not a refactor). If a file is genuinely untestable without a change, that's a STOP-and-report, not a quiet edit.
- `scripts/session-feeder.ts`, `scripts/gen-artifact-index.ts`, `scripts/no-raw-bun-test.ts` — environment shells, intentionally not unit-tested (their logic lives in tested libs).

## Steps

### Step 1: /api/artifacts route
Test (mock `node:fs` + `process.env.SPANDA_ARTIFACT_INDEX`): valid json → `{data: [...]}`; missing file → `{data: []}`; corrupt json → `{data: []}` (documents the silent-recovery invariant). Model on an existing route test's `vi.mock("node:fs", …)` + `GET(...)` call.
**Verify**: `bunx vitest run --project unit src/lib/__tests__/artifacts-route.test.ts` → pass.

### Step 2: comments route error mapping
Mock `@/lib/bead-comments` so `addBeadComment` throws `CommentValidationError` (→ expect 400), `CommentBackendError` (→ 500), generic (→ 500), and resolves (→ 201). Also non-string body → 400. GET maps `listBeadComments` similarly.
**Verify**: `bunx vitest run --project unit src/lib/__tests__/comments-route.test.ts` → pass.

### Step 3: useArtifactIndex hook
Mock global `fetch`: 200 + `{data:[...]}` → query data equals the list; non-ok → query enters error state; reuse the repo's QueryClient test wrapper (find an existing hook test for the pattern).
**Verify**: `bunx vitest run --project unit src/hooks/__tests__/use-artifact-index.test.ts` → pass.

### Step 4: beat-outputs + artifacts-view components
Mock `useArtifactIndex`. beat-outputs: empty → renders nothing (`null`); 1 output → one link with its title; 2 → "Outputs (2)" + two links. artifacts-view: error state → error text; empty → empty-state copy; populated → one section per work-kind present, examples absent.
**Verify**: `bunx vitest run --project unit src/components/__tests__/beat-outputs.test.tsx src/components/__tests__/artifacts-view.test.tsx` → pass.

### Step 5: full suite stays green
**Verify**: `bunx vitest run --project unit` → all pass (no regressions); `bun run lint` exit 0.

## Test plan
- This plan *is* the test plan. New cases enumerated per step. ~12–16 new tests total.
- Patterns to copy: route tests after `src/lib/__tests__/approvals-route.test.ts`; component/hook tests after the nearest existing `*.test.tsx` that mocks a query hook with `@testing-library/react`.

## Done criteria
- [ ] 5 new test files exist and pass
- [ ] `bunx vitest run --project unit` exits 0 (full suite, no regressions)
- [ ] `bunx tsc --noEmit` + `bun run lint` exit 0
- [ ] No source file under test was modified (`git status` shows only new test files) — or a needed export change was reported and approved
- [ ] New tests are hermetic (no real fs/net — all mocked); none added under `__manual_tests__`
- [ ] `plans/README.md` row updated

## STOP conditions
- A source file can't be tested without an export/refactor change — report the specific change needed; don't edit source silently.
- No existing `*.test.tsx` uses `@testing-library/react` (the component-test pattern is absent) — report; the route + hook tests can still land, but flag that component testing infra may be missing.
- A "new" test actually hangs (recall raw `bun test` is guarded; always use `bunx vitest run --project unit`) — if vitest itself hangs on your test, you've added a non-hermetic dependency (real timer/fetch/fs) — fix it to be hermetic.

## Maintenance notes
- Reviewer: confirm tests assert behavior (status codes, rendered text, query states), not implementation details, and are hermetic.
- The `/api/artifacts` silent-`[]`-on-error is intentional (the index is rebuilt by the generator, not this route) — the test should *document* it, not "fix" it.
