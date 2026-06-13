# Plan 004: Bring the loose ~/.hermes operational scripts under version control

> **Executor instructions**: Follow step by step, verify each. STOP conditions halt you. Update `plans/README.md` when done. NOTE: this plan operates mostly OUTSIDE the spanda repo (the `~/.hermes` dir and the personal-os/vault git repo). Read the Scope carefully.
>
> **Drift check (run first)**: `ls -la /home/deploy/.hermes/scripts/*.sh` and confirm the files listed under "Current state" still exist; if the set differs materially, re-list and adapt.

## Status
- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt (operational resilience)
- **Planned at**: commit `d27ae764`, 2026-06-13

## Why this matters
Spanda's daily/weekly synthesis pipeline and the artifact/run-feed producers run from shell scripts that live **only** in `/home/deploy/.hermes/scripts/` with **no git home**. A machine rebuild, an accidental `rm`, or a bad edit loses them with no history and no recovery. `daily-focus.sh` already shows the right pattern — it's a symlink into the vault's git-backed skill dir. The rest aren't. This is pure operational risk on mission-critical automation (the nightly review, the run inbox, the artifact index).

## Current state
Loose, unversioned scripts in `/home/deploy/.hermes/scripts/` (confirm with `ls`):
- `daily-review-ritual.sh` (~380 lines — the orchestrator: pull/synth/deliver phases, fail-loud rc 6/7)
- `daily-review-pull.sh`, `daily-review-synth.sh`, `daily-review-deliver.sh`, `daily-review-auto.sh`, `daily-review-finalize.sh` (thin wrappers that `exec` the ritual with `--phase`)
- `session-feeder.sh`, `gen-artifact-index.sh` (cron wrappers, absolute interpreter paths)
- `slack-dm-aravinth.sh`, `daily-focus.sh` — **already a symlink** into `/home/deploy/personal-os/.claude/skills/daily-dashboard-synth/scripts/` (the model to copy)

The vault repo (`/home/deploy/personal-os`) is git-backed and already hosts `daily-focus.sh` at `.claude/skills/daily-dashboard-synth/scripts/daily-focus.sh`, symlinked from `~/.hermes/scripts/`. Hermes cron jobs reference scripts by name in `~/.hermes/scripts/` (verify: `hermes cron list`).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| List loose scripts | `ls -la /home/deploy/.hermes/scripts/*.sh` | shows the set above |
| Syntax-check a script | `bash -n <script>` | exit 0 |
| Confirm a wrapper still runs | `env -i HOME=/home/deploy PATH=/usr/bin:/bin bash <wrapper>` | rc 0 (for the no-agent ones) |
| Vault git | `git -C /home/deploy/personal-os status` | clean before, the moved files after |

## Scope
**In scope** (operate on these paths):
- Create a tracked home in the vault: `/home/deploy/personal-os/.hermes/scripts/` (mirror the existing `daily-focus.sh` home convention; if the team prefers, `.claude/skills/daily-dashboard-synth/scripts/` is the established dir — pick the one `daily-focus.sh` already uses and put the siblings beside it).
- Move (git mv into the vault) each loose `.sh` listed above (EXCEPT `daily-focus.sh`, already done), then replace the `~/.hermes/scripts/<name>.sh` with a symlink to the tracked copy.
- Commit the moved scripts in the **vault** repo.

**Out of scope**:
- The spanda repo `src/` — no app code changes here.
- Changing what the scripts DO — this is a relocation + symlink only; behavior must be byte-identical.
- `hermes cron` job definitions — they reference `~/.hermes/scripts/<name>.sh`, which still resolves (now via symlink); do not edit the cron unless a job references an absolute path that breaks.

## Steps

### Step 1: Establish the tracked home + move one script as a canary
Pick the tracked dir (the one `daily-focus.sh` lives in). `git mv`-or-copy `gen-artifact-index.sh` there, commit in the vault, then `ln -sfn <tracked>/gen-artifact-index.sh /home/deploy/.hermes/scripts/gen-artifact-index.sh`.
**Verify**: `readlink /home/deploy/.hermes/scripts/gen-artifact-index.sh` points at the tracked copy; `env -i HOME=/home/deploy PATH=/usr/bin:/bin bash /home/deploy/.hermes/scripts/gen-artifact-index.sh` → rc 0 (still works via symlink).

### Step 2: Move the rest
Repeat Step 1 for each remaining loose script. Keep file contents identical (copy bytes; do not reformat). After each, `bash -n` the symlinked path.
**Verify**: `ls -la /home/deploy/.hermes/scripts/*.sh` shows every script is now a symlink into the tracked dir (none are regular files except any you deliberately leave); `git -C /home/deploy/personal-os status` shows the new tracked files staged/committed.

### Step 3: Prove the ritual + cron paths still resolve
**Verify**:
- `bash -n /home/deploy/.hermes/scripts/daily-review-ritual.sh` → exit 0
- `/home/deploy/.hermes/scripts/daily-review-ritual.sh --phase synth --dry-run --date 2026-06-12` → exits 0 (dry-run, no deploy) and prints the synth log lines
- `hermes cron list` → the daily/feeder/index jobs still listed, unchanged

### Step 4: Document the topology
Add a short `OPERATIONS.md` (in the vault, next to the scripts, or in the spanda repo `docs/`) listing: each script, what it does, its cron schedule, and that `~/.hermes/scripts/*` are symlinks into the tracked dir. This is the missing onboarding doc.
**Verify**: the file exists and names every moved script.

## Test plan
- No unit tests (shell ops). The verification is behavioral: each symlinked script still runs (`bash -n` + a dry-run of the ritual) and the cron list is unchanged.
- Keep a pre-move `sha256sum` of each script and confirm the tracked copy matches (no accidental edits during the move).

## Done criteria
- [ ] Every loose `~/.hermes/scripts/*.sh` (except pre-existing symlinks) is now a symlink into a git-backed vault dir
- [ ] The moved scripts are committed in the vault repo (`git -C /home/deploy/personal-os log --oneline -1` shows the commit)
- [ ] `daily-review-ritual.sh --phase synth --dry-run --date 2026-06-12` exits 0
- [ ] `hermes cron list` unchanged (same jobs, same schedules)
- [ ] `OPERATIONS.md` exists and lists every script + schedule
- [ ] `sha256sum` of each tracked copy matches its pre-move hash
- [ ] `plans/README.md` row updated

## STOP conditions
- A cron job references a script by **absolute path** `/home/deploy/.hermes/scripts/...` that would now be a symlink — symlinks resolve fine, but if any job execs with a path assumption that breaks, report it before proceeding.
- A loose script `source`s another by relative path that the symlink would break — check for `source`/`.` of siblings; if found, report.
- The vault has uncommitted unrelated changes you'd sweep into your commit — `git -C /home/deploy/personal-os status` first; stage only the scripts you moved.

## Maintenance notes
- After this, editing a ritual script means editing the tracked copy (the symlink target); the `~/.hermes` path is just the runtime entry point.
- Reviewer: confirm contents are byte-identical to pre-move (this is a relocation, not a rewrite) and that no behavior changed.
- Follow-up deferred: these scripts could eventually move into the spanda repo proper if the daily pipeline is considered part of Spanda rather than personal-os tooling — out of scope here; the vault home matches the existing `daily-focus.sh` precedent.
