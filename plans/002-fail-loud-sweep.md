# Plan 002: Replace silent configured-resource fallbacks with loud failures

> **Executor instructions**: Follow step by step. Run every verification command. If a "STOP condition" occurs, stop and report. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat d27ae764..HEAD -- src/lib/backends/knots-backend.ts src/lib/orchestration-session-create.ts src/hooks/use-agent-info.ts src/lib/registry.ts src/lib/dispatch-pool-resolver.ts`
> If any in-scope file changed, compare excerpts to live code first; mismatch = STOP.

## Status
- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
`CLAUDE.md` has a hard rule, **"Fail Loudly, Never Silently"**: when a lookup for a *configured resource* (agent, pool, workflow, backend) can't resolve, the code must throw and emit a greppable banner — never coalesce to a literal default like `?? "claude"` or return `Object.values(x)[0]`. The repo documents two real past incidents this rule exists to prevent (OpenCode silently running every unrouted dispatch for months; a beads-store error masking a config gap). Four sites currently violate it; each one hides a misconfiguration that will surface later as baffling wrong behavior instead of an immediate, named error.

## Current state
The canonical loud-failure primitives already exist — **reuse them, do not invent a new error type**:
- `src/lib/dispatch-pool-resolver.ts` — defines `DispatchFailureError` and `emitDispatchFailureBanner(...)`; the marker phrase is `FOOLERY DISPATCH FAILURE`. Read `resolveDispatchAgent` there for the exact construction pattern (error kind, the fields it names: beat id / state / pool key, and the remediation string).

The four violations (confirmed):
1. `src/lib/backends/knots-backend.ts:391` —
   `const selectedWorkflowId = input.profileId ?? input.workflowId ?? "autopilot";`
   Coalesces a missing workflow to the first builtin. CLAUDE.md names `?? "implementation"`/`?? "default"`-style coalescing as banned.
2. `src/lib/orchestration-session-create.ts:287` —
   `const dialect = resolveDialect(agent.command ?? "claude");`
   `?? "claude"` is called out verbatim in the rule.
3. `src/hooks/use-agent-info.ts:55` —
   `const first = Object.values(settings.agents)[0];`
   "return the first registered X" is the exact anti-pattern from incident #1.
4. `src/lib/registry.ts:98` —
   `return detectMemoryManagerType(repoPath) ?? "beads";`
   Silently assumes `beads` when no `.beads/`/`.knots/` marker is found.

**Convention**: backend/dispatch resolution failures throw `DispatchFailureError` + call `emitDispatchFailureBanner`. UI hooks (`use-agent-info.ts`) can't throw into a render usefully — there, surface an explicit "no agent configured for <action>" state (return a typed sentinel the caller already renders, or throw to the nearest error boundary) rather than silently picking a wrong agent. Read how `use-agent-info.ts` consumers handle its return before choosing.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `bunx tsc --noEmit` (after `rm -rf .next/types`) | exit 0 |
| Tests | `bunx vitest run --project unit` | all pass |
| Lint | `bun run lint` | exit 0 |
| Find violations | `grep -rnE '\?\? "(claude|autopilot|beads|implementation|default)"' src/` | only intended config-literal uses remain |

## Scope
**In scope**: the four files above + any test files that assert their behavior (e.g. `src/lib/__tests__/registry*.test.ts`, `knots-backend*` tests — update expectations to the new throw).
**Out of scope**:
- `src/lib/dispatch-pool-resolver.ts` — reuse it, don't change it.
- `src/lib/workflows.ts` `BUILTIN_PROFILE_CATALOG` — listing profile names there is an allowed exception (it IS the descriptor source).
- Any `?? "<literal>"` that is a genuine value default (e.g. a UI label, a number), not a *configured resource* lookup. Judgement: a fallback is in scope only when the literal stands in for something the user was supposed to configure.

## Git workflow
- Branch: `advisor/002-fail-loud-sweep`.
- One commit per site is fine; conventional messages, e.g. `fix(knots): throw on unresolved workflow instead of defaulting to autopilot`.

## Steps

### Step 1: knots-backend workflow resolution
At `knots-backend.ts:391`, if both `input.profileId` and `input.workflowId` are absent, throw `DispatchFailureError` (kind `"backend"` or the kind `resolveDispatchAgent` uses for missing workflow — match the existing usage) naming the beat id and that no profile/workflow was supplied, and call `emitDispatchFailureBanner`. Only fall through to a resolved id when one is actually present.
**Verify**: `bunx vitest run --project unit src/lib/__tests__/knots-backend*.test.ts` → pass (update any test that expected the silent `autopilot` default to expect the throw).

### Step 2: orchestration dialect
At `orchestration-session-create.ts:287`, if `agent.command` is missing, throw a named error (reuse `DispatchFailureError`, kind `"agent"`) identifying the agent and the missing `command` field, rather than `?? "claude"`.
**Verify**: `bunx tsc --noEmit` → exit 0.

### Step 3: use-agent-info hook
At `use-agent-info.ts:55`, replace the `Object.values(settings.agents)[0]` fallback with an explicit "no agent configured" outcome. First read the hook's return type and its callers; pick the path that makes the UI show a clear unconfigured state (or throws to an error boundary) — never a mismatched agent.
**Verify**: `bunx vitest run --project unit` (run any `use-agent-info`/settings tests) → pass.

### Step 4: registry default
At `registry.ts:98`, in the function that returns `detectMemoryManagerType(repoPath) ?? "beads"`: trace its callers. If it runs at *repo registration* (a configured action), throw naming the path and the expected markers (`.beads/`, `.knots/`). If a caller genuinely needs a tolerant default for an unregistered probe, leave that caller a separate tolerant helper and make the registration path strict. Match whichever ADR-0005 (`bd` wrapper contract) implies.
**Verify**: `bunx vitest run --project unit src/lib/__tests__/registry*.test.ts` → pass.

## Test plan
- For each throwing site, add/inext a test asserting the named error is thrown when the configured resource is absent (model after existing backend-factory/dispatch tests that assert `DispatchFailureError`, e.g. `src/lib/__tests__/backend-factory-no-fallback.test.ts`).
- Update any existing test that asserted the old silent default.
- Verification: `bunx vitest run --project unit` → all pass.

## Done criteria
- [ ] `bunx tsc --noEmit` exits 0
- [ ] `bunx vitest run --project unit` exits 0 (incl. updated/new throw tests)
- [ ] `bun run lint` exits 0
- [ ] `grep -rnE '\?\? "(claude|autopilot|beads)"' src/` shows none of the four sites remain
- [ ] No out-of-scope files modified
- [ ] `plans/README.md` row updated

## STOP conditions
- A site turns out to be on a hot path where throwing would break a legitimate flow that currently relies on the default (e.g. registry's tolerant probe has a real caller) — report which caller and stop before changing that site.
- `DispatchFailureError`'s constructor signature differs from what the excerpt implies — read it and adapt; if unclear, stop and report.
- More than the four listed sites appear in the grep and you're unsure if they're configured-resource lookups — list them and stop.

## Maintenance notes
- Reviewer: confirm each throw NAMES the missing config and the fix (the rule requires the error to say what to set). A bare `throw new Error("missing")` does not satisfy it.
- The UI site (#3) is the subtle one — silently picking the first agent is "working" until the wrong agent runs. Make sure its new behavior is visible to the user, not just a thrown promise nobody catches.
