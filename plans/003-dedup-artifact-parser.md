# Plan 003: Eliminate the duplicated artifact parser (one tested source of truth)

> **Executor instructions**: Follow step by step, run every verification. STOP conditions halt you. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat d27ae764..HEAD -- src/lib/artifact-index.ts` and `git -C /home/deploy/code/html-artifacts diff --stat -- scripts/gen-artifact-index.mjs`. Mismatch vs excerpts = STOP.

## Status
- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (do BEFORE any further change to the artifact parser)
- **Category**: tech-debt
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
The artifact-link parsing logic exists in **two places that must agree but can silently drift**:
- `src/lib/artifact-index.ts` (TypeScript, 9 unit tests) — the parser Spanda uses at runtime via `/api/artifacts`.
- `/home/deploy/code/html-artifacts/scripts/gen-artifact-index.mjs` (plain JS, **no tests**) — re-implements `metaContent`, `deriveBeads`, `deriveKind`, title extraction, and the kind table. It is what actually *builds* `artifact-index.json` (run by the producer + a 15-min cron).
The `.mjs` even carries a comment admitting the duplication ("mirror that contract... change them THERE and reflect here"). If someone fixes a parsing bug in the tested TS file, the index that ships keeps the old behavior until a human remembers to hand-mirror it. The two live in **different git repos**, so a shared import is awkward — the clean fix is to make the generator run the tested code instead of re-implementing it.

## Current state
- `src/lib/artifact-index.ts` — exports the pure `parseArtifact(relPath, html)`, `buildIndex(files)`, `selectLibraryEntries`, `groupLibraryByKind`, `artifactsForBead`, `artifactHref`. No `node:fs`/`node:*` imports — fully portable. Resolution order: `meta spanda:bead` → (in `beads/` folder) filename id → unlinked; kind from top folder unless `spanda:kind` meta overrides; title `<title>`→`<h1>`→stem.
- `/home/deploy/code/html-artifacts/scripts/gen-artifact-index.mjs` — node script: `walk(DOCS)` collects `*.html` + mtime, re-implements `parseArtifact`, sorts newest-first, writes `~/.local/share/foolery/artifact-index.json`, and also renders the tunnel `/home/deploy/web/aravinth/outputs.html`. Run via `/home/deploy/.hermes/scripts/gen-artifact-index.sh` (cron, abs node path) and called directly by the html-artifacts skill after writing an artifact.
- `package.json` scripts: `test` = `vitest run --project unit`; the project runs on **bun**. `scripts/session-feeder.ts` is the precedent for a bun script in the spanda repo that imports `src/lib/*` and is run via a `~/.hermes` wrapper with an absolute bun path.

**Decision for this plan**: relocate the generator INTO the spanda repo as a bun script that imports `artifact-index.ts`, retire the `.mjs`, and repoint the cron wrapper + the skill's producer-call. Spanda then has the single tested parser; html-artifacts holds only artifacts.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `bunx tsc --noEmit` (after `rm -rf .next/types`) | exit 0 |
| Tests | `bunx vitest run --project unit src/lib/__tests__/artifact-index.test.ts` | pass |
| Run new generator | `bun scripts/gen-artifact-index.ts` | prints `[gen-artifact-index] N artifacts …`, writes the json + outputs.html |
| Lint | `bun run lint` | exit 0 |

## Scope
**In scope**:
- `scripts/gen-artifact-index.ts` (CREATE, in the spanda repo) — bun script importing `@/lib/artifact-index` (or a relative import that works under bun; check how `scripts/session-feeder.ts` imports `../src/lib/...`).
- `/home/deploy/.hermes/scripts/gen-artifact-index.sh` (EDIT) — point at `bun /home/deploy/code/spanda/scripts/gen-artifact-index.ts` with an absolute bun path (`/home/deploy/.bun/bin/bun`), mirroring `session-feeder.sh`.
- `/home/deploy/code/html-artifacts/scripts/gen-artifact-index.mjs` (DELETE, in the html-artifacts repo, separate commit there).
- `/home/deploy/personal-os/.claude/skills/html-artifacts/SKILL.md` (EDIT, vault repo) — change the producer-call line from `node ~/code/html-artifacts/scripts/gen-artifact-index.mjs` to the new bun script path.

**Out of scope**:
- The parsing logic itself in `artifact-index.ts` — reuse, don't change.
- The outputs.html *visual design* — port it faithfully (move `renderOutputsHtml` into the new script or a sibling, importing the same lib).
- `src/lib/external-session-feeder` / `run-feed` — unrelated.

## Steps

### Step 1: Create the bun generator in spanda, importing the tested lib
Create `scripts/gen-artifact-index.ts`. Import `buildIndex` (and the `renderOutputsHtml` equivalent — port it using `selectLibraryEntries` + `groupLibraryByKind` from the lib so the page logic is also de-duplicated). Do the fs walk of `SPANDA_ARTIFACTS_DOCS` (default `/home/deploy/code/html-artifacts/docs`), read each file, call `buildIndex([{path,html,mtime}])`, write `SPANDA_ARTIFACT_INDEX` (default `~/.local/share/foolery/artifact-index.json`) and `SPANDA_OUTPUTS_HTML` (default `/home/deploy/web/aravinth/outputs.html`). Model the fs-walk + env-default shape on the existing `.mjs` and on `scripts/session-feeder.ts`.
**Verify**: `bun scripts/gen-artifact-index.ts` → prints the count line; `python3 -c "import json;print(len(json.load(open('/home/deploy/.local/share/foolery/artifact-index.json'))))"` prints the same N as the old script did (compare to a run of the old `.mjs` first to confirm identical output).

### Step 2: Confirm byte-identical index vs the old generator
Before deleting the `.mjs`: run the old one, copy its json aside; run the new one; diff. They must produce the same entries (order + fields).
**Verify**: `diff <(node /home/deploy/code/html-artifacts/scripts/gen-artifact-index.mjs >/dev/null; cat /home/deploy/.local/share/foolery/artifact-index.json) <(bun /home/deploy/code/spanda/scripts/gen-artifact-index.ts >/dev/null; cat /home/deploy/.local/share/foolery/artifact-index.json)` → no differences (mtime-stable between back-to-back runs).

### Step 3: Repoint the cron wrapper and the producer-call
Edit `~/.hermes/scripts/gen-artifact-index.sh` to exec the new bun script (absolute bun path). Edit the html-artifacts SKILL.md producer-call line to the new path.
**Verify**: `env -i HOME=/home/deploy PATH=/usr/bin:/bin bash /home/deploy/.hermes/scripts/gen-artifact-index.sh` → prints the count line, rc 0 (proves it works under the minimal cron env).

### Step 4: Delete the .mjs (separate commit in the html-artifacts repo)
Remove `/home/deploy/code/html-artifacts/scripts/gen-artifact-index.mjs`. Commit in that repo.
**Verify**: `grep -rn "gen-artifact-index.mjs" /home/deploy/.hermes /home/deploy/personal-os/.claude/skills/html-artifacts` → no live references remain.

## Test plan
- No new spanda unit tests required (the parser is already tested; the script is an fs shell, like `session-feeder.ts`, which is not unit-tested per the hermetic policy).
- Add a one-line note in `docs/DEVELOPING.md` (if a "scripts" section exists) that `gen-artifact-index.ts` is the single source and the html-artifacts repo no longer carries a parser.
- Verification: Step 2's diff is the real test (identical output proves no behavioral drift in the migration).

## Done criteria
- [ ] `bun scripts/gen-artifact-index.ts` writes the index + outputs.html
- [ ] Step 2 diff shows identical index output vs the old `.mjs`
- [ ] `bunx tsc --noEmit` + `bun run lint` exit 0
- [ ] `~/.hermes/scripts/gen-artifact-index.sh` runs rc 0 under minimal env
- [ ] No live reference to `gen-artifact-index.mjs` anywhere
- [ ] `.mjs` deleted (committed in html-artifacts repo)
- [ ] `plans/README.md` row updated

## STOP conditions
- The new bun script's output differs from the `.mjs` (Step 2 diff non-empty) — the migration changed behavior; stop and reconcile before deleting anything.
- bun can't import `src/lib/artifact-index.ts` from `scripts/` (path/alias issue) — check `scripts/session-feeder.ts`'s import style; if still stuck, report.
- The skill file or cron wrapper isn't writable / lives somewhere unexpected — report, don't force.

## Maintenance notes
- After this lands, the parser has ONE home (`src/lib/artifact-index.ts`); the rule "change parsing in the lib, the generator follows automatically" is now true by construction, not by discipline.
- Reviewer: confirm `renderOutputsHtml` also imports the lib's `selectLibraryEntries`/`groupLibraryByKind` (don't leave a second copy of the kind table in the script).
- Cross-repo caveat: this plan touches three git repos (spanda, html-artifacts, personal-os/vault). Commit each in its own repo; do not attempt one commit across them.
