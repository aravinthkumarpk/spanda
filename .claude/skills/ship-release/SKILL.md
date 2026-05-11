---
name: ship-release
description: >-
  Cut a new release of foolery by confirming the version bump, syncing the
  release branch, previewing changes since the last tag, running quality gates,
  and publishing verified release artifacts.
---

# /ship-release

Cut a new release of foolery.

## Principles

- Release from `main`, not from a feature branch or implementation worktree.
- Keep the worktree clean before starting.
- Sync `main` before previewing or running gates.
- Do not use a PR workflow unless the user explicitly requests one.
- Do not manually recover by pushing ad hoc commits, tags, or GitHub releases.
  If the release path fails, fix the release script or the failing gate first.

## Steps

1. **Determine bump type** — Ask whether this is a `patch`, `minor`, or
   `major` release unless already specified, for example `/ship-release patch`.
   Show the current version and what each bump would produce.

2. **Preflight and sync** — Confirm the repo is on `main`, clean, and current:

   ```bash
   git status --short --branch
   git fetch origin main --tags
   git pull --ff-only
   ```

   If `git pull --ff-only` changes `main`, continue from the updated commit.
   If it fails because the branch diverged or the worktree is dirty, stop and
   report the exact remediation.

3. **Preview changes** — After syncing, run:

   ```bash
   git log $(git describe --tags --abbrev=0)..HEAD --oneline
   ```

   Present a brief summary so the user can confirm what is shipping.

4. **Run quality gates** — Execute in parallel:

   ```bash
   bun run lint
   bunx tsc --noEmit
   bun run test
   bun run build
   ```

   If any gate fails, stop and report. Do not proceed with a broken release.

5. **Cut the release** — Run:

   ```bash
   bun run release -- --<bump_type> --wait-for-artifacts
   ```

   The release script performs its own final branch preflight, release quality
   gates, atomic branch/tag push, GitHub Release creation, artifact workflow
   wait, and asset verification. If `main` moves during the final push, the
   script rebases the release commit onto the updated upstream, reruns the
   release quality gates, retags, and retries the atomic push.

6. **Report** — Show the new version, link to the GitHub Release, and confirm
   the runtime tarballs and `.sha256` files are available.
